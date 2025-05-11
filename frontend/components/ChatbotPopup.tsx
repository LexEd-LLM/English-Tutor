"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { X, Send } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface Message {
  role: "user" | "bot";
  content: string;
}

// <DEMO>
// Define the initial conversation for the prototype
const initialMessages: Message[] = [
  {
    role: "user",
    content: "Sự khác nhau giữa so sánh hơn và so sánh nhất"
  },
  {
    role: "bot",
    content: `Chào em! Để cô giúp em phân biệt rõ hơn về so sánh hơn và so sánh nhất nhé.

So sánh hơn và so sánh nhất đều dùng để so sánh các đối tượng, nhưng cách dùng và ý nghĩa của chúng khác nhau:

🔸 **So sánh hơn**  
Dùng để so sánh hai đối tượng (người, vật, sự việc...) với nhau.  
Mục đích là chỉ ra đối tượng nào có đặc điểm gì hơn so với đối tượng còn lại.

Ví dụ:  
- "This book is more interesting than that one."  
  *(Cuốn sách này thú vị hơn cuốn sách kia.)*  
- "She is taller than her brother."  
  *(Cô ấy cao hơn anh trai mình.)*

🔹 **So sánh nhất**  
Dùng để so sánh một đối tượng với tất cả các đối tượng còn lại trong một nhóm.  
Mục đích là chỉ ra đối tượng nào có đặc điểm nhất (cao nhất, đẹp nhất, thông minh nhất...) trong nhóm đó.

Ví dụ:  
- "Mount Everest is the highest mountain in the world."  
  *(Đỉnh Everest là ngọn núi cao nhất trên thế giới.)*  
- "He is the most intelligent student in the class."  
  *(Cậu ấy là học sinh thông minh nhất lớp.)*

**Tóm lại**, so sánh hơn dùng để so sánh giữa *hai đối tượng*, còn so sánh nhất dùng để so sánh *một đối tượng với cả một nhóm*.  
Em nắm vững lý thuyết này rồi thì sẽ làm bài tập tốt hơn đó! Cố lên nhé!`
  },
  {
    role: "user",
    content: "Hãy giúp em làm câu 17. Làm sao để xác định một câu là so sánh hơn hay so sánh nhất."
  },
  {
    role: "bot",
    content: `Tuyệt vời! Câu 17 là một ví dụ rất tốt để mình luyện tập phân biệt so sánh hơn và so sánh nhất đấy. Câu hỏi là:

"**Vo Nguyen Giap is considered ___ military strategist by many historians.**"

Để xác định xem câu này cần so sánh hơn hay so sánh nhất, em hãy tự trả lời các câu hỏi sau đây:

1. Câu này có đang so sánh *hai* đối tượng cụ thể với nhau không? Ví dụ, có phải câu này đang so sánh Đại tướng Võ Nguyên Giáp với một nhà chiến lược quân sự cụ thể nào khác không?

2. Hay câu này đang đánh giá Đại tướng Võ Nguyên Giáp so với *tất cả* các nhà chiến lược quân sự khác, để xếp hạng ông ở vị trí cao nhất?

Nếu em trả lời được hai câu hỏi này, em sẽ biết mình cần dùng so sánh hơn hay so sánh nhất đó! Hãy suy nghĩ kỹ rồi cho cô biết câu trả lời của em nhé. Cô ở đây để giúp đỡ nếu em cần thêm gợi ý.`
  },
  {
    role: "user",
    content: "Câu này không so sánh Đại tướng Võ Nguyên Giáp với một nhà chiến lược quân sự cụ thể, câu này đang so với tất cả các nhà chiến lược quân sự khác"
  },
  {
    role: "bot",
    content: `Chính xác! Em đã nhận định đúng rồi đó. Câu này đang đánh giá về tài năng của Đại tướng Võ Nguyên Giáp so với *tất cả* các nhà chiến lược quân sự khác.

Vậy, theo kiến thức mình vừa ôn tập, khi so sánh một đối tượng với *tất cả* các đối tượng còn lại trong một nhóm, chúng ta sử dụng cấu trúc gì? (So sánh hơn hay so sánh nhất?)`
  },
  {
    role: "user",
    content: "So sánh hơn ạ"
  },
  {
    role: "bot",
    content: `Gần đúng rồi, nhưng em hãy nhớ lại định nghĩa và mục đích của so sánh hơn và so sánh nhất một lần nữa nhé:

- **So sánh hơn:** So sánh *hai* đối tượng để thấy sự khác biệt.  
- **So sánh nhất:** So sánh *một* đối tượng với *tất cả* các đối tượng còn lại để tìm ra cái "nhất".

Trong trường hợp này, mình đang so sánh Đại tướng Võ Nguyên Giáp với **TẤT CẢ** các nhà chiến lược quân sự khác, vậy mình cần tìm ra nhà chiến lược "nhất" trong số đó.  
Vậy thì mình sẽ dùng cấu trúc nào?`
  },
  {
    role: "user",
    content: "So sánh nhất ạ"
  },
  {
    role: "bot",
    content: `Đúng rồi! Vì mình đang muốn nói đến mức độ cao nhất trong nhóm các nhà chiến lược quân sự, nên mình dùng **so sánh nhất**.

Bây giờ em hãy xem lại các lựa chọn trong câu 17 và chọn đáp án đúng nhất dựa trên cấu trúc so sánh nhất mà mình đã ôn tập nhé. Cố lên!`
  }
];

// <DEMO>

export const ChatbotPopup = () => {
  const [isOpen, setIsOpen] = useState(false);
//   const [messages, setMessages] = useState<Message[]>([]);
    const [messages, setMessages] = useState<Message[]>(() => {
        return initialMessages;
    });

  const [input, setInput] = useState("");
  const [position, setPosition] = useState({ x: window.innerWidth - 80, y: window.innerHeight - 80 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const iconRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Load chat history from session storage
  useEffect(() => {
    const savedMessages = sessionStorage.getItem("chatHistory");
    if (savedMessages) {
      setMessages(JSON.parse(savedMessages));
    }
  }, []);

  // Save chat history to session storage
  useEffect(() => {
    sessionStorage.setItem("chatHistory", JSON.stringify(messages));
  }, [messages]);

  // Handle mouse events for dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    
    if (iconRef.current) {
      setIsDragging(true);
      const rect = iconRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  };

  const animationFrame = useRef<number | null>(null);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
  
    if (animationFrame.current !== null) {
      cancelAnimationFrame(animationFrame.current);
    }
  
    animationFrame.current = requestAnimationFrame(() => {
      const newX = Math.max(0, Math.min(e.clientX - dragOffset.x, window.innerWidth - 64));
      const newY = Math.max(0, Math.min(e.clientY - dragOffset.y, window.innerHeight - 64));
      setPosition({ x: newX, y: newY });
    });
  }, [isDragging, dragOffset]);
  
  useEffect(() => {
    return () => {
      if (animationFrame.current !== null) {
        cancelAnimationFrame(animationFrame.current);
      }
    };
  }, []);  

  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
      
      // Snap to right edge with a smooth animation
      setPosition(prev => ({
        x: window.innerWidth - 64 - 16,
        y: Math.min(prev.y, window.innerHeight - 64 - 16), // Keep the y position unchanged
      }));
    }
  };

  // Add and remove event listeners
  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setPosition(prev => ({
        x: window.innerWidth - 64,
        y: prev.y < window.innerHeight - 64 ? prev.y : window.innerHeight - 64,
      }));
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      role: "user",
      content: input,
    };

    // Update messages with user input
    setMessages(prev => [...prev, userMessage]);
    setInput("");

    try {
      // Get current page content (this is just an example, you would need to implement this)
      const pageContent = document.querySelector("main")?.textContent || "";
      
      // Prepare data for API call
      const requestData = {
        history: messages.concat(userMessage),
        pageContent,
        promptText: input
      };

      // Call API
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      });

      if (response.ok) {
        const data = await response.json();
        
        // Add bot response to messages
        setMessages(prev => [...prev, {
          role: "bot",
          content: data.response,
        }]);
      } else {
        // Handle error
        setMessages(prev => [...prev, {
          role: "bot",
          content: "Sorry, I encountered an error. Please try again.",
        }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, {
        role: "bot",
        content: "Sorry, I encountered an error. Please try again.",
      }]);
    }
  };

  // Scroll to bottom of chat when new messages arrive
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <>
      {/* Floating chatbot icon */}
      <div
        ref={iconRef}
        className={`fixed rounded-full bg-green-500 w-12 h-12 flex items-center justify-center cursor-pointer shadow-lg transition-all duration-300 ease-out ${isDragging ? "scale-110" : ""}`}
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          transform: "translate(-50%, -50%)",
          zIndex: 50,
        }}
        onMouseDown={handleMouseDown}
        onClick={() => {
          if (!isDragging) toggleChat();
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-white"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </div>

      {/* Chat popup */}
      {isOpen && (
        <div
        className="fixed bottom-4 right-4 w-[360px] h-[calc(100vh-32px)] bg-white rounded-lg shadow-xl flex flex-col overflow-hidden z-50 border border-gray-200"
        style={{
            animation: "fadeIn 0.3s ease-out",
          }}
        >
          {/* Header */}
          <div className="p-4 border-b flex items-center justify-between bg-white">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <h3 className="font-semibold">Teacher AI</h3>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <X size={18} />
            </button>
          </div>

          {/* Chat messages */}
          <div 
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto p-4 space-y-4"
          >
            {messages.length === 0 ? (
              <div className="text-center text-gray-700 mt-4 space-y-4">
                <img src="/linga.svg" alt="Bot Avatar" className="mx-auto w-16 h-16" />
                <div>
                  <p className="font-semibold text-lg">Xin chào 👋</p>
                  <p className="text-base">Mình có thể giúp gì cho bạn?</p>
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => setInput("Tôi không biết bắt đầu làm bài thế nào")}
                    className="border border-blue-500 text-blue-600 rounded-md px-4 py-2 hover:bg-blue-50"
                  >
                    Tôi không biết bắt đầu làm bài thế nào
                  </button>
                  <button
                    onClick={() => setInput("Hướng dẫn giúp tôi cách làm bài tập")}
                    className="border border-blue-500 text-blue-600 rounded-md px-4 py-2 hover:bg-blue-50"
                  >
                    Hướng dẫn giúp tôi cách làm bài tập
                  </button>
                  <button
                    onClick={() => setInput("Tạo thêm các câu hỏi trắc nghiệm để ôn tập")}
                    className="border border-blue-500 text-blue-600 rounded-md px-4 py-2 hover:bg-blue-50"
                  >
                    Tạo thêm các câu hỏi trắc nghiệm để ôn tập
                  </button>
                </div>
              </div>
            ) : (
              messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] p-3 rounded-lg ${
                      message.role === "user"
                        ? "bg-green-500 text-white rounded-tr-none"
                        : "bg-gray-100 text-gray-800 rounded-tl-none"
                    }`}
                  >
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Input area */}
          <div className="p-4 border-t bg-white">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Nhập câu hỏi của bạn..."
                className="flex-1 p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <button
                onClick={sendMessage}
                className="p-2 bg-green-500 text-white rounded-md hover:bg-green-600"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}; 