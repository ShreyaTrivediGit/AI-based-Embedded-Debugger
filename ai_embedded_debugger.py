# Install dependencies
!pip install -q scikit-learn pandas matplotlib seaborn numpy requests json transformers torch python-dotenv

import os
import pandas as pd
import numpy as np
import requests
import json
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.feature_extraction.text import TfidfVectorizer
import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification
from IPython.display import display, Markdown
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# ✅ Hugging Face API Setup
API_URL = "https://api-inference.huggingface.co/models/bigcode/starcoder"
API_TOKEN = os.getenv('HUGGINGFACE_API_TOKEN')  # Get API token from environment variable
if not API_TOKEN:
    raise ValueError("""
    ⚠️ Hugging Face API token not found! 
    Please create a .env file in the same directory with the following content:
    HUGGINGFACE_API_TOKEN=your_api_token_here
    
    Or set the environment variable HUGGINGFACE_API_TOKEN with your token.
    You can get your token from: https://huggingface.co/settings/tokens
    """)

headers = {
    "Authorization": f"Bearer {API_TOKEN}",
    "Content-Type": "application/json"
}

# Proteus-specific hardware configurations
PROTEUS_HARDWARE = {
    'atmega2560': {
        'registers': ['PORTA', 'PORTB', 'PORTC', 'PORTD', 'PORTE', 'PORTF', 'PORTG'],
        'pins': range(0, 8),
        'adc_channels': range(0, 8),
        'timers': ['TIMER0', 'TIMER1', 'TIMER2', 'TIMER3', 'TIMER4', 'TIMER5'],
        'interrupts': ['INT0', 'INT1', 'INT2', 'INT3', 'INT4', 'INT5', 'INT6', 'INT7']
    },
    'atmega328p': {
        'registers': ['PORTB', 'PORTC', 'PORTD'],
        'pins': range(0, 8),
        'adc_channels': range(0, 6),
        'timers': ['TIMER0', 'TIMER1', 'TIMER2'],
        'interrupts': ['INT0', 'INT1']
    }
}

class EmbeddedCodeAnalyzer:
    def __init__(self):
        self.vectorizer = TfidfVectorizer()
        self.optimization_classifier = RandomForestClassifier(n_estimators=100, random_state=42)
        
    def analyze_code_optimization(self, code):
        """Analyze code for optimization opportunities"""
        suggestions = []
        
        # Check for delay usage
        if "_delay_ms" in code or "_delay_us" in code:
            suggestions.append("⚡ Consider using timer interrupts instead of delay functions for better efficiency")
            
        # Check for inefficient loops
        if "for(int i=0;i<" in code:
            suggestions.append("⚡ Consider using register variables for loop counters (e.g., register uint8_t i)")
            
        # Check for bit manipulation
        if "PORT" in code and "|=" in code:
            suggestions.append("⚡ Consider using direct port manipulation for better performance")
            
        return suggestions

    def visualize_code_metrics(self, code):
        """Generate visualizations for code analysis"""
        metrics = {
            'Functions': len([line for line in code.split('\n') if 'void' in line or 'int' in line]),
            'Loops': len([line for line in code.split('\n') if 'while' in line or 'for' in line]),
            'Delays': len([line for line in code.split('\n') if '_delay' in line]),
            'Port Access': len([line for line in code.split('\n') if 'PORT' in line or 'DDR' in line])
        }
        
        plt.figure(figsize=(10, 6))
        colors = ['#2ecc71', '#3498db', '#e74c3c', '#f1c40f']
        ax = sns.barplot(x=list(metrics.keys()), y=list(metrics.values()), palette=colors)
        plt.title('Code Metrics Analysis', pad=20)
        plt.xticks(rotation=0)
        
        # Add value labels on top of each bar
        for i, v in enumerate(metrics.values()):
            ax.text(i, v, str(v), ha='center', va='bottom')
            
        plt.tight_layout()
        plt.show()

def is_code_line(line):
    """Check if a line is actual code rather than explanation text"""
    line = line.strip()
    
    # Skip empty lines
    if not line:
        return False
        
    # Keep preprocessor directives
    if line.startswith('#'):
        return True
        
    # Keep lines with code content
    if any(char in line for char in '{}();=+-*/%'):
        return True
        
    # Keep lines with common C keywords
    if any(keyword in line for keyword in ['int', 'void', 'char', 'float', 'return', 'main']):
        return True
        
    return False

def format_code(code):
    """Format code with proper indentation"""
    formatted_lines = []
    indent_level = 0
    
    # Split code into tokens to handle one-line code
    tokens = []
    current_token = []
    
    for char in code:
        if char in '{};':
            if current_token:
                tokens.append(''.join(current_token).strip())
                current_token = []
            tokens.append(char)
        else:
            current_token.append(char)
    if current_token:
        tokens.append(''.join(current_token).strip())
    
    # Process tokens to create properly formatted lines
    current_line = []
    for token in tokens:
        if token == '{':
            if current_line:
                formatted_lines.append('    ' * indent_level + ' '.join(current_line))
                current_line = []
            formatted_lines.append('    ' * indent_level + token)
            indent_level += 1
        elif token == '}':
            if current_line:
                formatted_lines.append('    ' * indent_level + ' '.join(current_line))
                current_line = []
            indent_level = max(0, indent_level - 1)
            formatted_lines.append('    ' * indent_level + token)
        elif token == ';':
            current_line.append(token)
            formatted_lines.append('    ' * indent_level + ' '.join(current_line))
            current_line = []
        else:
            current_line.append(token)
    
    if current_line:
        formatted_lines.append('    ' * indent_level + ' '.join(current_line))
    
    return '\n'.join(formatted_lines)

def format_results(code, corrected_code):
    # Clean and format input code
    cleaned_input = []
    for line in code.splitlines():
        # Remove comments but keep the code part
        if '//' in line:
            line = line.split('//')[0]
        if line.strip():
            cleaned_input.append(line.strip())
    
    # Format both original and corrected code
    formatted_input = format_code('\n'.join(cleaned_input))
    formatted_corrected = format_code(corrected_code)
    
    # Remove any trailing "..." from corrected code
    formatted_corrected = formatted_corrected.rstrip('.')

    md_text = """
## 📄 Original Code
```c
{}
```

## ✨ Corrected Code
```c
{}
```""".format(formatted_input, formatted_corrected)
    display(Markdown(md_text))

def hf_generate_corrected_code(prompt):
    payload = {
        "inputs": prompt,
        "parameters": {
            "max_new_tokens": 500,
            "temperature": 0.5,
            "do_sample": True,
            "return_full_text": False
        }
    }

    try:
        response = requests.post(API_URL, headers=headers, data=json.dumps(payload))
        response.raise_for_status()
        result = response.json()

        if isinstance(result, list) and "generated_text" in result[0]:
            corrected_code = result[0]["generated_text"].strip()
            
            # Clean up the corrected code and ensure it's not repeating
            cleaned_lines = []
            seen_lines = set()  # Track unique lines
            for line in corrected_code.splitlines():
                # Skip "Solution:" line and ellipsis
                if line.strip().lower().startswith('solution:') or line.strip() == '...':
                    continue
                # Remove comments but keep the code
                if '//' in line:
                    line = line.split('//')[0]
                line = line.strip()
                if line and line not in seen_lines and not line.startswith('...'):  # Only add unique, non-empty lines
                    cleaned_lines.append(line)
                    seen_lines.add(line)
            return '\n'.join(cleaned_lines)

        return "[Unexpected response format]"

    except Exception as e:
        return f"[Error: {e}]"

def main():
    analyzer = EmbeddedCodeAnalyzer()
    
    print("🛠️ AI Embedded C Debugger")
    print("======================")
    
    # Get MCU type
    print("\nSelect MCU type:")
    for i, mcu in enumerate(PROTEUS_HARDWARE.keys(), 1):
        print(f"{i}. {mcu}")
    mcu_choice = int(input("Enter choice (1-{}): ".format(len(PROTEUS_HARDWARE))))
    mcu_type = list(PROTEUS_HARDWARE.keys())[mcu_choice - 1]
    
    # Get code input
    print("\n📝 Paste your embedded C code (press Enter twice to finish):\n")
    user_code_lines = []
    while True:
        line = input()
        if line.strip() == "":
            break
        # Skip "Solution:" line in input
        if not line.strip().lower().startswith('solution:'):
            user_code_lines.append(line)

    user_code = "\n".join(user_code_lines)

    if not user_code.strip():
        print("⚠️ No code entered.")
        return

    # Only remove comments, keep all code
    code_lines = []
    for line in user_code.splitlines():
        # Skip "Solution:" line
        if line.strip().lower().startswith('solution:'):
            continue
        if '//' in line:
            line = line.split('//')[0]
        if line.strip():
            code_lines.append(line.rstrip())

    if not code_lines:
        print("⚠️ No valid code found in input.")
        return
        
    filtered_code = "\n".join(code_lines)

    # Generate corrected code
    prompt = f"Fix and format the following C code:\n\n{filtered_code}\n\nProvide only the corrected code with proper indentation:\n"
    corrected_code = hf_generate_corrected_code(prompt)
    
    # Display results
    analyzer.visualize_code_metrics(filtered_code)
    format_results(filtered_code, corrected_code)

if __name__ == "__main__":
    main() 