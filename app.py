import asyncio
from flask import Flask, render_template, request, jsonify
import openai
import azure.cognitiveservices.speech as speechsdk
import base64
import io
from dotenv import load_dotenv
import os

# Carregar variáveis de ambiente do arquivo .env
load_dotenv()

app = Flask(__name__)

# OpenAI configuration
openai.api_key = os.getenv("OPENAI_API_KEY")

# Azure Speech configuration
azure_api_key = os.getenv("AZURE_API_KEY")
azure_region = os.getenv("AZURE_REGION")

# List to store responses
responses = []

# Initialize Azure Speech service
speech_config = speechsdk.SpeechConfig(subscription=azure_api_key, region=azure_region)

# Function to send question to OpenAI assistant
@app.route('/send_question', methods=['POST'])
def send_question():
    try:
        user_question = request.json['question']

        # Detect user language (example: assuming you have a function for this)
        user_language = detect_user_language(request)

        # Ask about voice preference
        if user_language == 'en-US':
            voice_preference = ask_voice_preference()
            speech_config.speech_synthesis_voice_name = voice_preference
        elif user_language == 'sr-Cyrl-RS':  # Example for Servo-Croatian
            speech_config.speech_synthesis_voice_name = 'sr-Cyrl-RS-SophieNeural'  # Example of a female voice in Servo-Croatian
        else:
            # Default to Servo-Croatian if not English
            speech_config.speech_synthesis_voice_name = 'sr-Cyrl-RS-SophieNeural'

        # Generate response from OpenAI
        complete_text = generate_openai_response(user_question)

        # Convert text to audio using Azure Speech
        audio_base64 = text_to_speech(complete_text)

        return jsonify({
            'text': complete_text,
            'audio_base64': audio_base64
        })

    except Exception as e:
        print(f"Error sending question to OpenAI assistant: {e}")
        return jsonify({'response': 'Error sending question to OpenAI assistant'}), 500

# Function to detect user language
def detect_user_language(request):
    # Implement the logic to detect the user's language
    # Simple example for demonstration purposes:
    return 'en-US'  # Return language as US English for this example

# Function to ask about voice preference
def ask_voice_preference():
    # Implement the logic to ask the user about voice preference
    # Simple example for demonstration purposes:
    return 'en-US-ZiraNeural'  # Return Zira as the female voice in US English for this example

# Function to generate response from OpenAI
def generate_openai_response(user_question):
    response = openai.ChatCompletion.create(
        model="gpt-4",
        messages=[
            {"role": "system",
             "content": "Welcome to the era of home technology with smart robots. I am Srbislav, your personal assistant, ready to introduce our amazing robots."
            },
            {"role": "system",
             "content": "In which language would you like to converse?"
            },
            {"role": "user",
             "content": user_question
            }
        ],
        temperature=1,
        max_tokens=300,
        top_p=1,
        frequency_penalty=0,
        presence_penalty=0,
        stream=False
    )
    return response['choices'][0]['message']['content']

# Function to convert text to audio using Azure Speech
def text_to_speech(text):
    try:
        audio_config = speechsdk.audio.AudioOutputConfig(use_default_speaker=True)
        synthesizer = speechsdk.SpeechSynthesizer(speech_config=speech_config, audio_config=audio_config)

        result = synthesizer.speak_text_async(text).get()
        if result.reason == speechsdk.ResultReason.SynthesizingAudioCompleted:
            audio_stream = io.BytesIO()
            audio_data_stream = speechsdk.AudioDataStream(result)
            audio_data_stream.save_to_wave_file(audio_stream)
            audio_stream.seek(0)
            audio_base64 = base64.b64encode(audio_stream.read()).decode('utf-8')
            return audio_base64
        else:
            print(f"Error synthesizing audio: {result.reason}")
            return None
    except Exception as e:
        print(f"Error converting text to audio with Azure Speech: {e}")
        return None

# Route for the home page
@app.route('/')
def index():
    return render_template('index.html', responses=responses)

if __name__ == '__main__':
    app.run(debug=True)
