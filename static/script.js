// Variáveis globais para armazenar objetos do reconhecimento de voz e controle de estado
var recognition;
var isListening = false;
var isSpeaking = false;

// Função para iniciar o reconhecimento de voz
function startSpeechRecognition() {
    recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.lang = getSpeechRecognitionLanguage(); // Define o idioma para o idioma do navegador ou padrão
    recognition.interimResults = false; // Não queremos resultados intermediários
    recognition.maxAlternatives = 1; // Apenas uma alternativa

    recognition.onstart = function() {
        console.log('Reconhecimento de voz iniciado. Você pode falar agora.');
        isListening = true;
    };

    recognition.onresult = function(event) {
        var transcript = event.results[0][0].transcript;
        console.log('Você disse: ', transcript);
        sendMessage(transcript); // Envia a mensagem transcrita
    };

    recognition.onspeechend = function() {
        console.log('Fim do discurso.');
        isListening = false;
        if (!isSpeaking) {
            // Reinicia o reconhecimento de voz após um curto intervalo de silêncio
            setTimeout(function() {
                if (isListening) {
                    recognition.start();
                }
            }, 1000); // Reinicia após 1 segundo (ajuste conforme necessário)
        }
    };

    recognition.onerror = function(event) {
        console.error('Erro no reconhecimento de voz: ', event.error);
        isListening = false;
        recognition.stop();
    };

    recognition.start();
}

// Função para obter o idioma do navegador ou padrão
function getSpeechRecognitionLanguage() {
    var navigatorLang = navigator.language || 'pt-BR'; // Idioma do navegador ou padrão para croata
    // Ajuste para suportar múltiplos idiomas
    if (navigatorLang.startsWith('hr-HR') || navigatorLang.startsWith('en') || navigatorLang.startsWith('hr')) {
        return navigatorLang; // Retorna o idioma do navegador se for pt-BR, en-US ou hr-HR
    } else {
        return 'pt-BR'; // Padrão para português do Brasil
    }
}

// Função para enviar mensagem
function sendMessage(userInput) {
    var chatHistory = document.getElementById('chat-history');

    // Exibe a pergunta do usuário no histórico
    var userMessage = '<div class="message user-message"><p><strong>Você:</strong> ' + userInput + '</p></div>';
    chatHistory.innerHTML += userMessage;

    // Envia a pergunta para o servidor Flask
    fetch('/send_question', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ question: userInput })
    })
    .then(response => response.json())
    .then(data => {
        const assistantMessage = '<div class="message assistant-message"><p><strong>Assistente:</strong> ' + data.text + '</p></div>';
        chatHistory.innerHTML += assistantMessage;

        // Utiliza Web Speech API para sintetizar o texto em áudio
        if (data.text) {
            isSpeaking = true;
            playTextAsSpeech(data.text);
        } else {
            console.error('Erro ao obter a resposta do assistente');
        }
    })
    .catch(error => {
        console.error('Erro ao enviar pergunta:', error);
    });

    // Limpa o campo de entrada do usuário
    document.getElementById('user-input').value = '';

    // Impede o envio do formulário
    return false;
}

// Função para reproduzir texto como áudio usando Web Speech API com sotaque francês
function playTextAsSpeech(text) {
    if ('speechSynthesis' in window) {
        var speech = new SpeechSynthesisUtterance(text);
        speech.lang = 'fr-FR'; // Define o idioma para francês (França) para obter o sotaque francês

        speech.onend = function(event) {
            isSpeaking = false;
            // Reativa o reconhecimento de voz após o assistente terminar de falar
            if (isListening) {
                recognition.start();
            }
        };
        window.speechSynthesis.speak(speech);
    } else {
        console.error('Web Speech API não é suportado neste navegador.');
    }
}

// Inicia o reconhecimento de voz quando a página é carregada
window.onload = function() {
    startSpeechRecognition();
};
