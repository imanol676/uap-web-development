"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useState, useEffect, useRef } from "react";

const MAX_MESSAGE_LENGTH = 4000;
const MIN_MESSAGE_LENGTH = 1;
const FORBIDDEN_PATTERNS = [/<script/gi, /javascript:/gi, /on\w+\s*=/gi];

function sanitizeInput(input: string): {
  isValid: boolean;
  sanitized: string;
  error?: string;
} {
  // Validar longitud
  if (input.length < MIN_MESSAGE_LENGTH) {
    return {
      isValid: false,
      sanitized: "",
      error: "El mensaje no puede estar vacío",
    };
  }

  if (input.length > MAX_MESSAGE_LENGTH) {
    return {
      isValid: false,
      sanitized: "",
      error: `El mensaje no puede exceder ${MAX_MESSAGE_LENGTH} caracteres`,
    };
  }

  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(input)) {
      return {
        isValid: false,
        sanitized: "",
        error: "El mensaje contiene contenido no permitido",
      };
    }
  }

  const sanitized = input
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .trim();

  return { isValid: true, sanitized };
}

export default function Chatbot() {
  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
    }),
    onError: (error) => {
      console.error("Error en el chat:", error);
      setErrorMessage(
        "Ocurrió un error al procesar tu mensaje. Por favor, intenta de nuevo."
      );
    },
  });

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    const savedMessages = localStorage.getItem("chatbot-messages");
    if (savedMessages) {
      try {
        const parsed = JSON.parse(savedMessages);
        if (Array.isArray(parsed) && parsed.length > 0) {
          console.log("Mensajes cargados desde localStorage");
        }
      } catch (error) {
        console.error("Error al cargar mensajes guardados:", error);
        localStorage.removeItem("chatbot-messages");
      }
    }
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      try {
        localStorage.setItem("chatbot-messages", JSON.stringify(messages));
      } catch (error) {
        console.error("Error al guardar mensajes:", error);
      }
    }
  }, [messages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (status === "ready" || status === "error") {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    if (errorMessage || validationError) {
      const timer = setTimeout(() => {
        setErrorMessage(null);
        setValidationError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage, validationError]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    setErrorMessage(null);
    setValidationError(null);

    if (!input.trim() || loading) return;

    const { isValid, sanitized, error: validationErr } = sanitizeInput(input);

    if (!isValid) {
      setValidationError(validationErr || "Entrada inválida");
      return;
    }

    try {
      setLoading(true);
      sendMessage({ text: sanitized });
      setInput("");
    } catch (err) {
      console.error("Error al enviar mensaje:", err);
      setErrorMessage(
        "No se pudo enviar el mensaje. Por favor, intenta de nuevo."
      );
      setLoading(false);
    }
  };

  const clearChat = () => {
    if (confirm("¿Estás seguro de que quieres borrar toda la conversación?")) {
      localStorage.removeItem("chatbot-messages");
      window.location.reload();
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col h-[600px] bg-gradient-to-br from-orange-50 to-amber-50 dark:from-gray-900 dark:to-gray-800 rounded-2xl shadow-2xl border border-amber-200 dark:border-amber-900/30 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-amber-600 px-6 py-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-white font-bold text-lg">AI Assistant</h2>
              <p className="text-orange-100 text-xs">
                {status === "streaming" ? "Escribiendo..." : "En línea"}
              </p>
            </div>
          </div>

          {/* Botón para limpiar chat */}
          {messages.length > 0 && (
            <button
              onClick={clearChat}
              className="px-3 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg text-sm font-medium transition-all duration-200 flex items-center space-x-1"
              title="Limpiar conversación"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              <span className="hidden sm:inline">Limpiar</span>
            </button>
          )}
        </div>
      </div>

      {/* Error Messages */}
      {(errorMessage || validationError) && (
        <div className="mx-6 mt-4 p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded-lg animate-fadeIn">
          <div className="flex items-start">
            <svg
              className="w-5 h-5 text-red-500 mt-0.5 mr-3 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800 dark:text-red-200">
                {validationError || errorMessage}
              </p>
            </div>
            <button
              onClick={() => {
                setErrorMessage(null);
                setValidationError(null);
              }}
              className="ml-3 text-red-500 hover:text-red-700 dark:hover:text-red-300"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 scrollbar-thin scrollbar-thumb-amber-300 scrollbar-track-transparent">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-amber-500 rounded-full mx-auto flex items-center justify-center shadow-lg">
                <svg
                  className="w-8 h-8 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <p className="text-gray-500 dark:text-gray-400 font-medium">
                ¡Comienza una conversación!
              </p>
              <p className="text-gray-400 dark:text-gray-500 text-sm">
                Escribe un mensaje para empezar
              </p>
            </div>
          </div>
        ) : (
          messages.map((message, idx) => (
            <div
              key={message.id}
              className={`flex ${
                message.role === "user" ? "justify-end" : "justify-start"
              } animate-fadeIn`}
            >
              <div
                className={`flex items-start space-x-2 max-w-[80%] ${
                  message.role === "user"
                    ? "flex-row-reverse space-x-reverse"
                    : ""
                }`}
              >
                {/* Avatar */}
                <div
                  className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    message.role === "user"
                      ? "bg-gradient-to-br from-orange-500 to-amber-600 shadow-md"
                      : "bg-gradient-to-br from-gray-600 to-gray-700 dark:from-gray-700 dark:to-gray-800 shadow-md"
                  }`}
                >
                  {message.role === "user" ? (
                    <svg
                      className="w-5 h-5 text-white"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="w-5 h-5 text-white"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
                      <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
                    </svg>
                  )}
                </div>

                {/* Message Bubble */}
                <div
                  className={`rounded-2xl px-4 py-3 shadow-md ${
                    message.role === "user"
                      ? "bg-gradient-to-br from-orange-500 to-amber-600 text-white rounded-tr-sm"
                      : "bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 border border-gray-200 dark:border-gray-700 rounded-tl-sm"
                  }`}
                >
                  <div className="text-sm leading-relaxed">
                    {message.parts.map((part, index) =>
                      part.type === "text" ? (
                        <span
                          key={index}
                          className="whitespace-pre-wrap break-words"
                        >
                          {part.text}
                        </span>
                      ) : null
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}

        {status === "streaming" && (
          <div className="flex justify-start animate-fadeIn">
            <div className="flex items-start space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-gray-600 to-gray-700 dark:from-gray-700 dark:to-gray-800 rounded-full flex items-center justify-center shadow-md">
                <svg
                  className="w-5 h-5 text-white"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
                </svg>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-2xl rounded-tl-sm px-4 py-3 shadow-md border border-gray-200 dark:border-gray-700">
                <div className="flex space-x-1">
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0ms" }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: "150ms" }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: "300ms" }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-amber-200 dark:border-amber-900/30 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm px-6 py-4">
        <form onSubmit={handleSubmit} className="flex items-end space-x-3">
          <div className="flex-1 relative">
            <textarea
              value={input}
              onChange={(e) => {
                const newValue = e.target.value;
                setInput(newValue);
                // Limpiar error de validación cuando el usuario empieza a escribir
                if (validationError) {
                  setValidationError(null);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              placeholder="Escribe tu mensaje..."
              rows={1}
              disabled={loading}
              maxLength={MAX_MESSAGE_LENGTH}
              className="w-full px-4 py-3 bg-white dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 dark:focus:ring-orange-900/30 resize-none transition-all duration-200 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ minHeight: "48px", maxHeight: "120px" }}
            />
            {/* Contador de caracteres */}
            <div className="absolute bottom-2 right-2 text-xs text-gray-400 dark:text-gray-500">
              {input.length}/{MAX_MESSAGE_LENGTH}
            </div>
          </div>
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-600 text-white font-medium rounded-xl hover:from-orange-600 hover:to-amber-700 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 flex items-center space-x-2"
          >
            {loading ? (
              <>
                <svg
                  className="animate-spin h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                <span>Enviando...</span>
              </>
            ) : (
              <>
                <span>Enviar</span>
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  />
                </svg>
              </>
            )}
          </button>
        </form>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 text-center">
          Presiona Enter para enviar, Shift+Enter para nueva línea
        </p>
      </div>
    </div>
  );
}
