from flask import Flask, request, jsonify
from flask_cors import CORS
import spacy
from keybert import KeyBERT
import wikipedia
import re
from typing import List, Dict
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# Initialize NLP models
try:
    nlp = spacy.load("en_core_web_sm")
    logger.info("spaCy model loaded successfully")
except OSError:
    logger.error("spaCy model not found. Please run: python -m spacy download en_core_web_sm")
    nlp = None

try:
    kw_model = KeyBERT()
    logger.info("KeyBERT model loaded successfully")
except Exception as e:
    logger.error(f"KeyBERT initialization failed: {e}")
    kw_model = None

def extract_keywords_spacy(text: str, max_keywords: int = 10) -> List[str]:
    """Extract keywords using spaCy NER and noun chunks"""
    if not nlp or not text:
        return []
    
    doc = nlp(text)
    keywords = set()
    
    # Extract named entities
    for ent in doc.ents:
        if ent.label_ in ['PERSON', 'ORG', 'GPE', 'PRODUCT', 'EVENT', 'LAW', 'LANGUAGE']:
            keywords.add(ent.text.lower())
    
    # Extract noun chunks (important concepts)
    for chunk in doc.noun_chunks:
        # Filter for meaningful chunks (2-3 words max, containing important POS tags)
        words = chunk.text.split()
        if 1 <= len(words) <= 3:
            # Check if chunk contains nouns or proper nouns
            has_important_word = any(token.pos_ in ['NOUN', 'PROPN'] for token in chunk)
            if has_important_word:
                keywords.add(chunk.text.lower())
    
    # Extract important single nouns and proper nouns
    for token in doc:
        if token.pos_ in ['NOUN', 'PROPN'] and len(token.text) > 3:
            keywords.add(token.text.lower())
    
    return list(keywords)[:max_keywords]

def extract_keywords_keybert(text: str, max_keywords: int = 10) -> List[str]:
    """Extract keywords using KeyBERT"""
    if not kw_model or not text:
        return []
    
    try:
        keywords = kw_model.extract_keywords(
            text, 
            keyphrase_ngram_range=(1, 3),
            stop_words='english',
            top_n=max_keywords,
            diversity=0.7
        )
        return [kw[0] for kw in keywords]
    except Exception as e:
        logger.error(f"KeyBERT extraction failed: {e}")
        return []

def get_definition(keyword: str) -> str:
    """Fetch student-friendly definition from Wikipedia"""
    try:
        # Clean up the keyword
        keyword = keyword.strip().title()
        
        # Try to get Wikipedia summary
        summary = wikipedia.summary(keyword, sentences=2, auto_suggest=True)
        
        # Extract first sentence for brevity
        first_sentence = summary.split('.')[0] + '.'
        
        # If too long, truncate
        if len(first_sentence) > 200:
            first_sentence = first_sentence[:197] + '...'
            
        return first_sentence
    except wikipedia.exceptions.DisambiguationError as e:
        # If there are multiple options, try the first suggestion
        try:
            if e.options:
                summary = wikipedia.summary(e.options[0], sentences=1)
                return summary.split('.')[0] + '.'
        except:
            pass
        return f"A concept related to {keyword} (multiple meanings exist)"
    except wikipedia.exceptions.PageError:
        return f"A technical term or concept: {keyword}"
    except Exception as e:
        logger.error(f"Definition fetch error for '{keyword}': {e}")
        return f"An important concept: {keyword}"

def merge_keywords(spacy_keywords: List[str], keybert_keywords: List[str]) -> List[str]:
    """Merge and deduplicate keywords from both methods"""
    # Combine and deduplicate
    all_keywords = list(set(spacy_keywords + keybert_keywords))
    
    # Sort by length (prefer single words over phrases) and alphabetically
    all_keywords.sort(key=lambda x: (len(x.split()), x))
    
    return all_keywords[:15]  # Return top 15 keywords

@app.route('/api/analyze', methods=['POST'])
def analyze_transcript():
    """
    Analyze transcript and return keywords with definitions
    Expected JSON: { "transcript": "text..." }
    Returns: { "transcript": "...", "keywords": [{"word": "...", "definition": "..."}] }
    """
    try:
        data = request.get_json()
        logger.info(f"[ANALYZE] Received analyze request")
        
        if not data or 'transcript' not in data:
            logger.warning('[ANALYZE] No transcript provided in request')
            return jsonify({'error': 'No transcript provided'}), 400
        
        transcript = data['transcript']
        logger.info(f"[ANALYZE] Transcript length: {len(transcript)}")
        
        if not transcript or len(transcript.strip()) < 10:
            logger.info('[ANALYZE] Transcript too short, returning empty keywords')
            return jsonify({
                'transcript': transcript,
                'keywords': []
            })
        
        # Extract keywords using both methods
        logger.info('[ANALYZE] Extracting keywords with spaCy...')
        spacy_kw = extract_keywords_spacy(transcript, max_keywords=10)
        logger.info(f"[ANALYZE] spaCy found {len(spacy_kw)} keywords: {spacy_kw}")
        
        logger.info('[ANALYZE] Extracting keywords with KeyBERT...')
        keybert_kw = extract_keywords_keybert(transcript, max_keywords=10)
        logger.info(f"[ANALYZE] KeyBERT found {len(keybert_kw)} keywords: {keybert_kw}")
        
        # Merge keywords
        merged_keywords = merge_keywords(spacy_kw, keybert_kw)
        logger.info(f"[ANALYZE] Merged {len(merged_keywords)} keywords: {merged_keywords}")
        
        # Get definitions for keywords
        keywords_with_definitions = []
        for keyword in merged_keywords:
            logger.info(f"[ANALYZE] Getting definition for: {keyword}")
            definition = get_definition(keyword)
            keywords_with_definitions.append({
                'word': keyword,
                'definition': definition
            })
        
        logger.info(f"[ANALYZE] Returning {len(keywords_with_definitions)} keywords with definitions")
        return jsonify({
            'transcript': transcript,
            'keywords': keywords_with_definitions
        })
    
    except Exception as e:
        logger.error(f"[ANALYZE] Error analyzing transcript: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'spacy_loaded': nlp is not None,
        'keybert_loaded': kw_model is not None
    })

@app.route('/', methods=['GET'])
def home():
    """Root endpoint"""
    return jsonify({
        'message': 'AI Teaching Assistant - Keyword Analysis Service',
        'endpoints': {
            '/api/analyze': 'POST - Analyze transcript and extract keywords',
            '/api/health': 'GET - Health check'
        }
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5002, debug=True)
