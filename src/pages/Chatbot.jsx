import React, { useState, useEffect, useRef } from 'react';
import '../components/styles/Chatbot.css';

const Chatbot = () => {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  // Mensajes iniciales del bot
  const initialBotMessages = [
    {
      id: 1,
      text: '¡Hola! Soy el asistente virtual de Inventarios. ¿En qué puedo ayudarte hoy?',
      sender: 'bot',
      timestamp: new Date(),
      quickReplies: [
        'Consultar inventario',
        'Reportar problema',
        'Soporte técnico'
      ]
    }
  ];

  // Efecto para mensajes iniciales
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages(initialBotMessages);
    }
  }, [isOpen]);

  // Auto-scroll al final de los mensajes
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (inputValue.trim() === '') return;

    // Agregar mensaje del usuario
    const userMessage = {
      id: messages.length + 1,
      text: inputValue,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages([...messages, userMessage]);
    setInputValue('');
    setIsTyping(true);

    // Simular respuesta del bot después de un retraso
    setTimeout(() => {
      const botResponse = generateBotResponse(inputValue);
      setMessages(prev => [...prev, botResponse]);
      setIsTyping(false);
    }, 1000);
  };

  const handleQuickReply = (reply) => {
    const userMessage = {
      id: messages.length + 1,
      text: reply,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages([...messages, userMessage]);
    setIsTyping(true);

    // Simular respuesta del bot después de un retraso
    setTimeout(() => {
      const botResponse = generateBotResponse(reply);
      setMessages(prev => [...prev, botResponse]);
      setIsTyping(false);
    }, 1000);
  };

  const generateBotResponse = (userInput) => {
    const input = userInput.toLowerCase();
    let response;

    // Respuestas predefinidas (puedes conectar esto a una API de IA real)
    if (input.includes('inventario') || input.includes('consultar')) {
      response = {
        id: messages.length + 2,
        text: 'Puedo ayudarte con información sobre el inventario. ¿Qué artículo necesitas consultar?',
        sender: 'bot',
        timestamp: new Date(),
        quickReplies: [
          'Monitores',
          'Computadoras',
          'Impresoras',
          'Ver todo'
        ]
      };
    } else if (input.includes('problema') || input.includes('reportar')) {
      response = {
        id: messages.length + 2,
        text: 'Lamento escuchar que tienes un problema. Por favor describe el inconveniente y crearé un ticket de soporte.',
        sender: 'bot',
        timestamp: new Date()
      };
    } else if (input.includes('hola') || input.includes('buenos días')) {
      response = {
        id: messages.length + 2,
        text: '¡Hola de nuevo! ¿En qué más puedo ayudarte?',
        sender: 'bot',
        timestamp: new Date(),
        quickReplies: [
          'Necesito ayuda con el sistema',
          'Cómo generar un reporte',
          'Consultar manuales'
        ]
      };
    } else {
      response = {
        id: messages.length + 2,
        text: 'Entendido. Si necesitas ayuda específica sobre el sistema de inventarios, puedes preguntarme cosas como:\n\n- "¿Cómo buscar un artículo?"\n- "Necesito reportar un problema"\n- "¿Dónde ver los manuales?"',
        sender: 'bot',
        timestamp: new Date()
      };
    }

    return response;
  };

  const toggleChatbot = () => {
    setIsOpen(!isOpen);
    if (!isOpen && messages.length === 0) {
      setMessages(initialBotMessages);
    }
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="chatbot-container">
      {isOpen ? (
        <div className="chatbot-window">
          <div className="chatbot-header">
            <div className="chatbot-title">
              <h3>Asistente de Inventarios</h3>
              <p>Estoy aquí para ayudarte</p>
            </div>
            <button className="close-button" onClick={toggleChatbot}>
              ×
            </button>
          </div>

          <div className="chatbot-messages">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`message ${message.sender}`}
              >
                <div className="message-content">
                  <p>{message.text}</p>
                  <span className="message-time">
                    {formatTime(message.timestamp)}
                  </span>
                </div>
                {message.quickReplies && (
                  <div className="quick-replies">
                    {message.quickReplies.map((reply, index) => (
                      <button
                        key={index}
                        className="quick-reply"
                        onClick={() => handleQuickReply(reply)}
                      >
                        {reply}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {isTyping && (
              <div className="message bot">
                <div className="message-content">
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form className="chatbot-input" onSubmit={handleSendMessage}>
            <input
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              placeholder="Escribe tu mensaje..."
              autoFocus
            />
            <button type="submit">
              <svg viewBox="0 0 24 24" width="24" height="24">
                <path fill="currentColor" d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path>
              </svg>
            </button>
          </form>
        </div>
      ) : (
        <button className="chatbot-toggle" onClick={toggleChatbot}>
          <svg viewBox="0 0 24 24" width="24" height="24">
            <path fill="currentColor" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z"></path>
            <path fill="currentColor" d="M11 16h2v-4h4v-2h-4V6h-2v4H7v2h4z"></path>
          </svg>
        </button>
      )}
    </div>
  );
};

export default Chatbot;