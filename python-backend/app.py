from flask import Flask, request, jsonify
from flask_cors import CORS
import wikipedia
import re
from typing import List, Dict
import logging
import nltk
from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize, sent_tokenize
from nltk.tag import pos_tag

# Download required NLTK data
try:
    nltk.data.find('tokenizers/punkt')
except LookupError:
    nltk.download('punkt')

try:
    nltk.data.find('corpora/stopwords')
except LookupError:
    nltk.download('stopwords')

try:
    nltk.data.find('taggers/averaged_perceptron_tagger')
except LookupError:
    nltk.download('averaged_perceptron_tagger')

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

def extract_keywords_spacy(text: str, max_keywords: int = 10) -> List[str]:
    """Extract keywords using NLTK POS tagging (nouns and proper nouns)"""
    if not text:
        return []
    
    try:
        # Tokenize into sentences
        sentences = sent_tokenize(text)
        keywords = set()
        stop_words = set(stopwords.words('english'))
        
        for sentence in sentences:
            # Tokenize and POS tag
            tokens = word_tokenize(sentence.lower())
            pos_tags = pos_tag(tokens)
            
            # Extract nouns and proper nouns
            for word, pos in pos_tags:
                # NN = Noun, NNS = Plural Noun, NNP = Proper Noun, NNPS = Plural Proper Noun
                if pos in ['NN', 'NNS', 'NNP', 'NNPS'] and word not in stop_words and len(word) > 2:
                    keywords.add(word)
        
        # Sort by frequency and return top keywords
        return sorted(list(keywords))[:max_keywords]
    except Exception as e:
        logger.error(f"NLTK extraction failed: {e}")
        return []

def extract_keywords_keybert(text: str, max_keywords: int = 10) -> List[str]:
    """Removed - not used"""
    return []

def merge_keywords(spacy_keywords: List[str], keybert_keywords: List[str]) -> List[str]:
    """Removed - not used"""
    return spacy_keywords[:15]

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
        
        # Extract keywords using NLTK
        logger.info('[ANALYZE] Extracting keywords with NLTK...')
        nltk_kw = extract_keywords_spacy(transcript, max_keywords=10)
        logger.info(f"[ANALYZE] NLTK found {len(nltk_kw)} keywords: {nltk_kw}")
        
        # Use only NLTK keywords (merged approach)
        merged_keywords = nltk_kw
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
        'nltk_ready': True
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
    import os
    port = int(os.environ.get('PORT', 5002))
    debug = os.environ.get('FLASK_ENV') != 'production'
    app.run(host='0.0.0.0', port=port, debug=debug)
