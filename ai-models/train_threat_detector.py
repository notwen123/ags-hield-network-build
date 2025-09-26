#!/usr/bin/env python3
"""
DAGShield AI Threat Detection Model Training Script

This script trains a machine learning model to detect Web3 threats including:
- Phishing attacks
- Rug pulls
- Flash loan attacks
- Smart contract exploits
"""

import os
import json
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score
import joblib
import onnx
import onnxmltools
from skl2onnx import convert_sklearn
from skl2onnx.common.data_types import FloatTensorType
import matplotlib.pyplot as plt
import seaborn as sns

class ThreatDetectionTrainer:
    def __init__(self, data_path="./data", model_path="./models"):
        self.data_path = data_path
        self.model_path = model_path
        self.scaler = StandardScaler()
        self.label_encoder = LabelEncoder()
        self.model = None
        
        # Create directories if they don't exist
        os.makedirs(data_path, exist_ok=True)
        os.makedirs(model_path, exist_ok=True)
        
        # Threat categories
        self.threat_categories = [
            'safe',
            'phishing',
            'rug_pull',
            'flash_loan_attack',
            'smart_contract_exploit',
            'sandwich_attack',
            'front_running',
            'back_running'
        ]
    
    def generate_synthetic_data(self, n_samples=10000):
        """Generate synthetic training data for Web3 threats"""
        print(f"🔄 Generating {n_samples} synthetic training samples...")
        
        np.random.seed(42)
        data = []
        
        for i in range(n_samples):
            # Generate base transaction features
            sample = {
                'tx_id': f'tx_{i}',
                'gas_limit': np.random.randint(21000, 500000),
                'gas_price': np.random.exponential(20),
                'value': np.random.exponential(1.0),
                'data_length': np.random.randint(0, 10000),
                'to_address_age': np.random.randint(0, 365 * 5),  # Days
                'from_address_age': np.random.randint(0, 365 * 5),
                'transaction_count': np.random.randint(1, 1000),
                'unique_addresses': np.random.randint(1, 100),
                'time_between_txs': np.random.exponential(60),  # Seconds
                'contract_creation': np.random.choice([0, 1], p=[0.9, 0.1]),
                'token_transfer': np.random.choice([0, 1], p=[0.7, 0.3]),
                'dex_interaction': np.random.choice([0, 1], p=[0.8, 0.2]),
                'approval_amount': np.random.exponential(1000),
                'slippage_tolerance': np.random.uniform(0.1, 10.0),
                'mev_potential': np.random.uniform(0, 1),
                'network_congestion': np.random.uniform(0, 1),
                'address_reputation': np.random.uniform(0, 1),
                'contract_verified': np.random.choice([0, 1], p=[0.3, 0.7]),
                'honeypot_score': np.random.uniform(0, 1),
            }
            
            # Generate threat-specific patterns
            threat_type = self.generate_threat_pattern(sample)
            sample['threat_type'] = threat_type
            
            data.append(sample)
        
        df = pd.DataFrame(data)
        
        # Save synthetic data
        df.to_csv(f"{self.data_path}/synthetic_threat_data.csv", index=False)
        print(f"✅ Synthetic data saved to {self.data_path}/synthetic_threat_data.csv")
        
        return df
    
    def generate_threat_pattern(self, sample):
        """Generate threat patterns based on transaction characteristics"""
        
        # Safe transactions (70% of data)
        if np.random.random() < 0.7:
            return 'safe'
        
        # Phishing patterns
        if (sample['approval_amount'] > 10000 and 
            sample['to_address_age'] < 7 and
            sample['contract_verified'] == 0):
            sample['approval_amount'] = np.random.uniform(10**18, 10**30)  # Unlimited approval
            sample['honeypot_score'] = np.random.uniform(0.7, 1.0)
            return 'phishing'
        
        # Rug pull patterns
        if (sample['dex_interaction'] == 1 and 
            sample['value'] > 10 and
            sample['time_between_txs'] < 10):
            sample['slippage_tolerance'] = np.random.uniform(50, 100)  # High slippage
            sample['mev_potential'] = np.random.uniform(0.8, 1.0)
            return 'rug_pull'
        
        # Flash loan attack patterns
        if (sample['gas_limit'] > 300000 and
            sample['data_length'] > 5000 and
            sample['unique_addresses'] > 10):
            sample['value'] = np.random.uniform(1000, 100000)  # Large amounts
            sample['time_between_txs'] = 0  # Same block
            return 'flash_loan_attack'
        
        # Smart contract exploit patterns
        if (sample['contract_creation'] == 1 and
            sample['gas_limit'] > 200000 and
            sample['contract_verified'] == 0):
            sample['honeypot_score'] = np.random.uniform(0.6, 0.9)
            return 'smart_contract_exploit'
        
        # Sandwich attack patterns
        if (sample['dex_interaction'] == 1 and
            sample['mev_potential'] > 0.7 and
            sample['gas_price'] > 50):
            sample['slippage_tolerance'] = np.random.uniform(0.1, 1.0)
            return 'sandwich_attack'
        
        # Front running patterns
        if (sample['gas_price'] > 100 and
            sample['mev_potential'] > 0.8 and
            sample['time_between_txs'] < 5):
            return 'front_running'
        
        # Back running patterns
        if (sample['gas_price'] < 10 and
            sample['mev_potential'] > 0.6 and
            sample['dex_interaction'] == 1):
            return 'back_running'
        
        return 'safe'
    
    def load_data(self, file_path=None):
        """Load training data"""
        if file_path is None:
            file_path = f"{self.data_path}/synthetic_threat_data.csv"
        
        if not os.path.exists(file_path):
            print("📊 No existing data found, generating synthetic data...")
            return self.generate_synthetic_data()
        
        print(f"📥 Loading data from {file_path}")
        df = pd.read_csv(file_path)
        print(f"✅ Loaded {len(df)} samples")
        return df
    
    def preprocess_data(self, df):
        """Preprocess the data for training"""
        print("🔄 Preprocessing data...")
        
        # Separate features and labels
        feature_columns = [col for col in df.columns if col not in ['tx_id', 'threat_type']]
        X = df[feature_columns].copy()
        y = df['threat_type'].copy()
        
        # Handle missing values
        X = X.fillna(X.median())
        
        # Scale features
        X_scaled = self.scaler.fit_transform(X)
        X_scaled = pd.DataFrame(X_scaled, columns=feature_columns)
        
        # Encode labels
        y_encoded = self.label_encoder.fit_transform(y)
        
        print(f"✅ Preprocessed data: {X_scaled.shape[0]} samples, {X_scaled.shape[1]} features")
        print(f"📊 Threat distribution:")
        threat_counts = pd.Series(y).value_counts()
        for threat, count in threat_counts.items():
            print(f"   {threat}: {count} ({count/len(y)*100:.1f}%)")
        
        return X_scaled, y_encoded, feature_columns
    
    def train_model(self, X, y):
        """Train the threat detection model"""
        print("🤖 Training threat detection model...")
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )
        
        # Train multiple models and select the best
        models = {
            'RandomForest': RandomForestClassifier(
                n_estimators=100,
                max_depth=10,
                random_state=42,
                n_jobs=-1
            ),
            'GradientBoosting': GradientBoostingClassifier(
                n_estimators=100,
                max_depth=6,
                random_state=42
            )
        }
        
        best_model = None
        best_score = 0
        best_name = ""
        
        for name, model in models.items():
            print(f"🔄 Training {name}...")
            model.fit(X_train, y_train)
            
            # Evaluate
            y_pred = model.predict(X_test)
            accuracy = accuracy_score(y_test, y_pred)
            
            print(f"   {name} accuracy: {accuracy:.4f}")
            
            if accuracy > best_score:
                best_score = accuracy
                best_model = model
                best_name = name
        
        self.model = best_model
        print(f"✅ Best model: {best_name} (accuracy: {best_score:.4f})")
        
        # Detailed evaluation
        y_pred = self.model.predict(X_test)
        print("\n📊 Classification Report:")
        print(classification_report(y_test, y_pred, 
                                  target_names=self.label_encoder.classes_))
        
        # Feature importance
        if hasattr(self.model, 'feature_importances_'):
            self.plot_feature_importance(X.columns)
        
        return X_test, y_test, y_pred
    
    def plot_feature_importance(self, feature_names):
        """Plot feature importance"""
        importance = self.model.feature_importances_
        indices = np.argsort(importance)[::-1][:20]  # Top 20 features
        
        plt.figure(figsize=(12, 8))
        plt.title("Top 20 Feature Importance for Threat Detection")
        plt.bar(range(len(indices)), importance[indices])
        plt.xticks(range(len(indices)), [feature_names[i] for i in indices], rotation=45)
        plt.tight_layout()
        plt.savefig(f"{self.model_path}/feature_importance.png", dpi=300, bbox_inches='tight')
        plt.close()
        
        print(f"📊 Feature importance plot saved to {self.model_path}/feature_importance.png")
    
    def save_model(self):
        """Save the trained model in multiple formats"""
        print("💾 Saving model...")
        
        # Save scikit-learn model
        joblib.dump(self.model, f"{self.model_path}/threat_detector.joblib")
        joblib.dump(self.scaler, f"{self.model_path}/scaler.joblib")
        joblib.dump(self.label_encoder, f"{self.model_path}/label_encoder.joblib")
        
        # Convert to ONNX format for Rust integration
        try:
            initial_type = [('float_input', FloatTensorType([None, len(self.scaler.feature_names_in_)]))]
            onnx_model = convert_sklearn(self.model, initial_types=initial_type)
            
            with open(f"{self.model_path}/threat_detection.onnx", "wb") as f:
                f.write(onnx_model.SerializeToString())
            
            print(f"✅ ONNX model saved to {self.model_path}/threat_detection.onnx")
        except Exception as e:
            print(f"⚠️ Could not save ONNX model: {e}")
        
        # Save metadata
        metadata = {
            'model_type': type(self.model).__name__,
            'feature_names': list(self.scaler.feature_names_in_),
            'threat_categories': list(self.label_encoder.classes_),
            'training_date': pd.Timestamp.now().isoformat(),
            'model_version': '1.0.0'
        }
        
        with open(f"{self.model_path}/model_metadata.json", 'w') as f:
            json.dump(metadata, f, indent=2)
        
        print("✅ Model saved successfully")
    
    def evaluate_model(self, X_test, y_test, y_pred):
        """Evaluate model performance"""
        print("📊 Model Evaluation:")
        
        # Confusion matrix
        cm = confusion_matrix(y_test, y_pred)
        plt.figure(figsize=(10, 8))
        sns.heatmap(cm, annot=True, fmt='d', cmap='Blues',
                   xticklabels=self.label_encoder.classes_,
                   yticklabels=self.label_encoder.classes_)
        plt.title('Threat Detection Confusion Matrix')
        plt.ylabel('True Label')
        plt.xlabel('Predicted Label')
        plt.tight_layout()
        plt.savefig(f"{self.model_path}/confusion_matrix.png", dpi=300, bbox_inches='tight')
        plt.close()
        
        # Calculate per-class metrics
        accuracy = accuracy_score(y_test, y_pred)
        print(f"Overall Accuracy: {accuracy:.4f}")
        
        # Threat-specific accuracy
        for i, threat_class in enumerate(self.label_encoder.classes_):
            class_mask = y_test == i
            if np.sum(class_mask) > 0:
                class_accuracy = accuracy_score(y_test[class_mask], y_pred[class_mask])
                print(f"{threat_class} Accuracy: {class_accuracy:.4f}")

def main():
    """Main training pipeline"""
    print("🛡️ DAGShield AI Threat Detection Model Training")
    print("=" * 50)
    
    # Initialize trainer
    trainer = ThreatDetectionTrainer()
    
    # Load or generate data
    df = trainer.load_data()
    
    # Preprocess data
    X, y, feature_names = trainer.preprocess_data(df)
    
    # Train model
    X_test, y_test, y_pred = trainer.train_model(X, y)
    
    # Evaluate model
    trainer.evaluate_model(X_test, y_test, y_pred)
    
    # Save model
    trainer.save_model()
    
    print("\n🎉 Training completed successfully!")
    print(f"📁 Model files saved to: {trainer.model_path}")
    print("🚀 Ready for deployment in DAGShield nodes")

if __name__ == "__main__":
    main()
