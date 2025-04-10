# AI Embedded C Debugger

An AI-powered debugger for embedded C code that provides code analysis, optimization suggestions, and automatic corrections.

## Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/ai-embedded-debugger.git
cd ai-embedded-debugger
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Set up your Hugging Face API token:
   - Copy the template environment file:
     ```bash
     cp .env.template .env
     ```
   - Get your API token from [Hugging Face](https://huggingface.co/settings/tokens)
   - Edit `.env` and replace `your_token_here` with your actual API token

## Usage

Run the debugger:
```bash
python ai_embedded_debugger.py
```

Follow the prompts to:
1. Select your MCU type
2. Paste your embedded C code
3. View the analysis results, including:
   - Code metrics visualization
   - Properly formatted original code
   - Corrected code with improvements

## Features

- Code formatting and correction
- Syntax error detection
- Hardware configuration analysis
- Code optimization suggestions
- Visual code metrics
- Support for multiple MCU types

## Security

- The API token is stored in a `.env` file which is not tracked by git
- Never commit your actual API token to the repository
- Each user needs to set up their own API token
