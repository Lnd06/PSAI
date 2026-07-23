import os
import sys
import json
import pickle
import pandas as pd
import nltk
from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize
from nltk.stem import RSLPStemmer
from nltk.classify import apply_features
from string import punctuation

# Set NLTK download directory inside backend to avoid permission errors
nltk_data_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../nltk_data'))
os.makedirs(nltk_data_dir, exist_ok=True)
nltk.data.path.append(nltk_data_dir)

def download_nltk_resources():
    """Downloads necessary NLTK resources to the local directory."""
    nltk.download('stopwords', download_dir=nltk_data_dir, quiet=True)
    nltk.download('punkt', download_dir=nltk_data_dir, quiet=True)
    nltk.download('punkt_tab', download_dir=nltk_data_dir, quiet=True)
    nltk.download('rslp', download_dir=nltk_data_dir, quiet=True)

class EmotionClassifier:
    def __init__(self):
        download_nltk_resources()
        self.stemmer = RSLPStemmer()
        self.stopwords = set(stopwords.words('portuguese') + list(punctuation))
        self.frequency = None
        self.classifier = None

    def tokenize(self, text):
        tokens = word_tokenize(text)
        return [token.lower() for token in tokens]

    def clean_stopwords(self, tokens):
        return [word for word in tokens if word not in self.stopwords]

    def stemming(self, tokens):
        return [self.stemmer.stem(word) for word in tokens]

    def preprocess_text(self, text):
        tokens = self.tokenize(text)
        tokens_no_stop = self.clean_stopwords(tokens)
        return self.stemming(tokens_no_stop)

    def extract_features(self, words):
        words_set = set(words)
        features = {}
        for common_word in self.frequency:
            features[common_word] = (common_word in words_set)
        return features

    def train(self, csv_path, model_path):
        """Trains the Naive Bayes model and saves it to a pickle file."""
        if not os.path.exists(csv_path):
            raise FileNotFoundError(f"Dataset comments.csv not found at {csv_path}")

        # Read dataset
        df = pd.read_csv(csv_path)

        # Preprocess each comment in dataset
        processed_comments = []
        all_words = []
        for _, row in df.iterrows():
            comment_text = str(row['comment'])
            emotion = row['emotion']
            stemmed_tokens = self.preprocess_text(comment_text)
            processed_comments.append((stemmed_tokens, emotion))
            all_words.extend(stemmed_tokens)

        # Generate vocabulary frequency distribution
        self.frequency = nltk.FreqDist(all_words)

        # Apply features
        feature_sets = []
        for (tokens, emotion) in processed_comments:
            feature_sets.append((self.extract_features(tokens), emotion))

        # Train Naive Bayes Classifier
        self.classifier = nltk.NaiveBayesClassifier.train(feature_sets)

        # Save to pickle file
        with open(model_path, 'wb') as f:
            pickle.dump({
                'classifier': self.classifier,
                'frequency': self.frequency
            }, f)

        print(f"Model successfully trained and saved to {model_path}")

    def load(self, model_path):
        """Loads a pre-trained model from a pickle file."""
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Model file not found at {model_path}. Please train the model first.")

        with open(model_path, 'rb') as f:
            data = pickle.load(f)
            self.classifier = data['classifier']
            self.frequency = data['frequency']

    def classify(self, text):
        """Classifies a given text and returns the predicted emotion."""
        if not self.classifier or not self.frequency:
            raise ValueError("Model is not loaded or trained.")

        stemmed_tokens = self.preprocess_text(text)
        features = self.extract_features(stemmed_tokens)
        return self.classifier.classify(features)

if __name__ == '__main__':
    backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))
    csv_path = os.path.join(backend_dir, 'data/comments.csv')
    model_path = os.path.join(backend_dir, 'data/model.pkl')

    if len(sys.argv) < 2:
        print("Usage: python classify_emotion.py --train | --classify \"<text>\"")
        sys.exit(1)

    mode = sys.argv[1]

    try:
        classifier = EmotionClassifier()

        if mode == '--train':
            classifier.train(csv_path, model_path)
            sys.exit(0)

        elif mode == '--classify':
            if len(sys.argv) < 3:
                print("Error: Missing text to classify.")
                sys.exit(1)
            
            text_to_classify = sys.argv[2]
            # Try to load existing model
            if not os.path.exists(model_path):
                # Auto train if pickle is missing
                classifier.train(csv_path, model_path)
            else:
                classifier.load(model_path)

            emotion = classifier.classify(text_to_classify)
            print(json.dumps({"emotion": emotion}))
            sys.exit(0)

        else:
            print(f"Unknown option: {mode}")
            sys.exit(1)

    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)
