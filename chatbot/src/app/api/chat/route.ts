import { streamText, convertToModelMessages, UIMessage } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { bookTools } from "../../../lib/tools";

export const runtime = "nodejs";

// Validación de mensajes
function validateMessages(messages: UIMessage[]): {
  isValid: boolean;
  error?: string;
} {
  if (!Array.isArray(messages)) {
    return { isValid: false, error: "Los mensajes deben ser un array" };
  }

  if (messages.length === 0) {
    return { isValid: false, error: "Se requiere al menos un mensaje" };
  }

  if (messages.length > 100) {
    return { isValid: false, error: "Demasiados mensajes en la conversación" };
  }

  // Validar cada mensaje
  for (const message of messages) {
    if (!message.role || !message.parts) {
      return { isValid: false, error: "Formato de mensaje inválido" };
    }

    // Validar longitud de mensajes individuales
    for (const part of message.parts) {
      if (part.type === "text" && part.text && part.text.length > 4000) {
        return { isValid: false, error: "El mensaje es demasiado largo" };
      }
    }
  }

  return { isValid: true };
}

export async function POST(req: Request) {
  try {
    // Validar Content-Type
    const contentType = req.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      return new Response(
        JSON.stringify({ error: "Content-Type debe ser application/json" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Parsear y validar el cuerpo de la solicitud
    let body;
    try {
      body = await req.json();
    } catch (error) {
      return new Response(
        JSON.stringify({ error: "JSON inválido en el cuerpo de la solicitud" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const { messages }: { messages: UIMessage[] } = body;

    // Validar mensajes
    const validation = validateMessages(messages);
    if (!validation.isValid) {
      return new Response(JSON.stringify({ error: validation.error }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Verificar que la API key esté configurada
    if (!process.env.OPENROUTER_API_KEY) {
      console.error("OPENROUTER_API_KEY no está configurada");
      return new Response(
        JSON.stringify({ error: "Configuración del servidor incompleta" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const openrouter = createOpenRouter({
      apiKey: process.env.OPENROUTER_API_KEY,
    });

    const result = await streamText({
      model: openrouter("x-ai/grok-4.1-fast:free"),
      messages: convertToModelMessages(messages),
      system: `Eres un asistente inteligente especializado en gestionar bibliotecas personales de libros.

REGLA CRÍTICA: NUNCA devuelvas una respuesta vacía. SIEMPRE debes escribir texto para el usuario explicando lo que hiciste.

Tu propósito es ayudar a los usuarios a:
- Agregar nuevos libros a su biblioteca
- Actualizar información de libros existentes (estado de lectura, calificaciones, progreso)
- Eliminar libros que ya no necesiten
- Buscar y filtrar libros por diversos criterios
- Proporcionar estadísticas y análisis de su hábito de lectura

INSTRUCCIONES IMPORTANTES:

1. OBLIGATORIO: Después de usar cualquier herramienta, escribe un mensaje explicando el resultado
2. Ejemplo: Si agregas un libro, responde "✅ He agregado 'Fundación' de Isaac Asimov a tu biblioteca (ID: 1)"
3. Si buscas libros, muestra la lista con detalles
4. Si generas estadísticas, explica los números de forma clara
5. Sé amable, útil y conversacional
6. Para acciones destructivas (eliminar), confirma con el usuario antes de ejecutar
7. Si el usuario no especifica el estado de un libro al agregarlo, usa "to-read" por defecto

ESTADOS DE LECTURA:
- "to-read": Por leer
- "reading": Leyendo actualmente  
- "completed": Completado

PRIORIDADES:
- "low": Baja prioridad
- "medium": Prioridad media (default)
- "high": Alta prioridad

GÉNEROS COMUNES:
ficción, no ficción, fantasía, ciencia ficción, romance, misterio, thriller, histórico, biografía, autoayuda, terror, aventura, poesía, drama, etc.`,
      tools: bookTools,
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("Error en el endpoint de chat:", error);

    // Manejar diferentes tipos de errores
    if (error instanceof Error) {
      // Error de red o de la API
      if (
        error.message.includes("fetch") ||
        error.message.includes("network")
      ) {
        return new Response(
          JSON.stringify({ error: "Error de conexión con el servicio de IA" }),
          {
            status: 503,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Error de autenticación
      if (error.message.includes("auth") || error.message.includes("401")) {
        return new Response(
          JSON.stringify({
            error: "Error de autenticación con el servicio de IA",
          }),
          {
            status: 401,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    }

    // Error genérico
    return new Response(
      JSON.stringify({ error: "Error interno del servidor" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
