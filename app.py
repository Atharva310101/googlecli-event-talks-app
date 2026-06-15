import os
import time
import requests
import xml.etree.ElementTree as ET
from flask import Flask, jsonify, render_template, request
from bs4 import BeautifulSoup

app = Flask(__name__)

# Cache configuration (5 minutes timeout)
CACHE_TIMEOUT = 300
cache = {
    "data": None,
    "last_fetched": 0
}

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

def fetch_and_parse_feed():
    """Fetches the XML Atom feed and parses it into discrete updates."""
    response = requests.get(FEED_URL, timeout=15)
    response.raise_for_status()
    
    root = ET.fromstring(response.content)
    # Atom feed namespace
    ns = {'atom': 'http://www.w3.org/2005/Atom'}
    
    entries = []
    
    for entry_node in root.findall('atom:entry', ns):
        # Extract date from <title> (e.g. "June 15, 2026")
        date_title = entry_node.find('atom:title', ns)
        date_str = date_title.text if date_title is not None else "Unknown Date"
        
        # Extract entry ID
        id_node = entry_node.find('atom:id', ns)
        entry_id = id_node.text if id_node is not None else ""
        
        # Extract link
        link_node = entry_node.find('atom:link[@rel="alternate"]', ns)
        if link_node is None:
            link_node = entry_node.find('atom:link', ns)
        
        link_url = "https://cloud.google.com/bigquery/docs/release-notes"
        if link_node is not None:
            link_url = link_node.attrib.get('href', link_url)
            
        # Extract updated timestamp
        updated_node = entry_node.find('atom:updated', ns)
        updated_str = updated_node.text if updated_node is not None else ""
        
        # Extract and parse HTML content
        content_node = entry_node.find('atom:content', ns)
        content_html = content_node.text if content_node is not None else ""
        
        soup = BeautifulSoup(content_html, 'html.parser')
        headings = soup.find_all('h3')
        
        updates = []
        if not headings:
            # Fallback if there are no <h3> tags in the HTML
            text_content = soup.get_text(separator=' ').strip()
            # Clean up white spaces
            text_content = " ".join(text_content.split())
            updates.append({
                'id': f"{entry_id}_0",
                'type': 'Update',
                'html': str(soup),
                'text': text_content
            })
        else:
            # Segment updates by <h3> headings
            for idx, h3 in enumerate(headings):
                update_type = h3.get_text().strip()
                
                sibling_content = []
                next_node = h3.next_sibling
                while next_node and next_node.name != 'h3':
                    sibling_content.append(str(next_node))
                    next_node = next_node.next_sibling
                
                html_frag = "".join(sibling_content)
                text_frag = BeautifulSoup(html_frag, 'html.parser').get_text(separator=' ').strip()
                
                # Clean up whitespace and newlines
                text_frag = " ".join(text_frag.split())
                
                updates.append({
                    'id': f"{entry_id}_{idx}",
                    'type': update_type,
                    'html': html_frag,
                    'text': text_frag
                })
        
        entries.append({
            'date': date_str,
            'id': entry_id,
            'link': link_url,
            'updated': updated_str,
            'updates': updates
        })
        
    return entries

@app.route('/')
def index():
    """Serves the main application landing page."""
    return render_template('index.html')

@app.route('/api/releases')
def get_releases():
    """API endpoint to get parsed release notes. Supports caching and forced refresh."""
    force_refresh = request.args.get('force_refresh', 'false').lower() == 'true'
    now = time.time()
    
    if force_refresh or not cache["data"] or (now - cache["last_fetched"] > CACHE_TIMEOUT):
        try:
            data = fetch_and_parse_feed()
            cache["data"] = data
            cache["last_fetched"] = now
            return jsonify({
                "status": "success",
                "source": "live",
                "last_fetched": cache["last_fetched"],
                "data": data
            })
        except Exception as e:
            # Gracefully handle network issues by falling back to cache if it exists
            if cache["data"]:
                return jsonify({
                    "status": "partial_success",
                    "source": "cache_fallback",
                    "error": str(e),
                    "last_fetched": cache["last_fetched"],
                    "data": cache["data"]
                })
            else:
                return jsonify({
                    "status": "error",
                    "message": "Failed to fetch release notes and no cached data is available.",
                    "details": str(e)
                }), 500
    
    return jsonify({
        "status": "success",
        "source": "cache",
        "last_fetched": cache["last_fetched"],
        "data": cache["data"]
    })

if __name__ == '__main__':
    # Run the server locally on port 5000
    app.run(debug=True, host='127.0.0.1', port=5000)
