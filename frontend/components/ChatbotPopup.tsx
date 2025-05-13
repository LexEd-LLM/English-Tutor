"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { X, Send, MoreVertical } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Menu, MenuItem } from "@mui/material"; 

/**
 * ChatbotPopup — floating draggable chat widget.
 *
 * Props
 * -----
 * pageContent – full plain‑text content of the current lesson.  
 *             MUST be provided by the page using this component so that
 *             the backend receives the correct context.
 */
interface ChatbotPopupProps {
  pageContent: string;
}

interface Message {
  role: "user" | "bot";
  content: string;
}

export const ChatbotPopup = ({ pageContent }: ChatbotPopupProps) => {
  // -------------- Local state -------------- //
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [position, setPosition] = useState({ x: window.innerWidth - 80, y: window.innerHeight - 80 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // -------------- Refs -------------- //
  const iconRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const animationFrame = useRef<number | null>(null);

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const openMenu = Boolean(anchorEl);
  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleCloseMenu = () => setAnchorEl(null);
  const handleClearChat = () => {
    setMessages([]);
    sessionStorage.removeItem("chatHistory");
    setAnchorEl(null);
  };
  const [isThinking, setIsThinking] = useState(false);

  // -------------- Persist history in‑tab -------------- //
  useEffect(() => {
    const saved = sessionStorage.getItem("chatHistory");
    if (saved) setMessages(JSON.parse(saved));
  }, []);

  useEffect(() => {
    sessionStorage.setItem("chatHistory", JSON.stringify(messages));
  }, [messages]);

  // -------------- Drag handlers -------------- //
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!iconRef.current) return;
    setIsDragging(true);
    const rect = iconRef.current.getBoundingClientRect();
    setDragOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;
      if (animationFrame.current !== null) cancelAnimationFrame(animationFrame.current);
      animationFrame.current = requestAnimationFrame(() => {
        setPosition({
          x: Math.max(0, Math.min(e.clientX - dragOffset.x, window.innerWidth - 64)),
          y: Math.max(0, Math.min(e.clientY - dragOffset.y, window.innerHeight - 64)),
        });
      });
    },
    [isDragging, dragOffset]
  );

  const handleMouseUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    setPosition((prev) => ({
      x: window.innerWidth - 80,
      y: Math.min(prev!.y, window.innerHeight - 80),
    }));
  };

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseMove]);

  // -------------- Window resize -------------- //
  useEffect(() => {
    const onResize = () =>
      setPosition((prev) => ({
        x: window.innerWidth - 80,
        y: Math.min(prev!.y, window.innerHeight - 80),
      }));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // -------------- UI helpers -------------- //
  const toggleChat = () => setIsOpen((o) => !o);

  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  };

  useEffect(scrollToBottom, [messages]);

  // -------------- Send message -------------- //
  const sendMessage = async () => {
    if (!input.trim()) return;
    setIsThinking(true);

    const userMsg: Message = { role: "user", content: input.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          history: messages.concat(userMsg),
          pageContent: pageContent,
          promptText: userMsg.content,
        }),
      });
      setIsThinking(false);

      if (!res.ok) throw new Error("Request failed");
      const data = (await res.json()) as { response: string };
      setMessages((prev) => [...prev, { role: "bot", content: data.response }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "bot", content: "Sorry, something went wrong. Please try again." },
      ]);
    }
  };

  // -------------- Render -------------- //
  return (
    <>
      {/* Floating Icon */}
      <div
        ref={iconRef}
        onMouseDown={handleMouseDown}
        onClick={() => {
          if (!isDragging) toggleChat();
        }}
        className={`fixed z-50 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-green-500 shadow-lg transition-transform ${
          isDragging ? "scale-110" : ""
        }`}
        style={{ left: position.x, top: position.y }}
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

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-4 right-4 z-50 flex h-[calc(100vh-32px)] w-80 flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl animate-in fade-in-0 slide-in-from-bottom-2.5">
          {/* Header */}
          <div className="flex items-center justify-between border-b bg-white p-4">
            <h3 className="flex items-center gap-2 font-semibold">
              <span className="inline-block h-2 w-2 rounded-full bg-green-500" /> Teacher AI
            </h3>
            <div className="flex gap-2 items-center">
              <button onClick={handleMenuClick} className="text-gray-500 hover:text-gray-700">
                <MoreVertical size={18} />
              </button>
              <Menu anchorEl={anchorEl} open={openMenu} onClose={handleCloseMenu}>
                <MenuItem onClick={handleClearChat}>Clear conversation</MenuItem>
              </Menu>
              <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-gray-700">
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div ref={chatContainerRef} className="flex-1 space-y-4 overflow-y-auto p-4">
            {messages.length === 0 ? (
              <div className="text-center text-gray-700 mt-4 space-y-4">
                <img src="/linga.svg" alt="Bot Avatar" className="mx-auto w-16 h-16" />
                <div>
                  <p className="font-semibold text-lg">Hello 👋</p>
                  <p className="text-base">How can I help you?</p>
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => setInput("I don’t know how to start the exercise")}
                    className="border border-blue-500 text-blue-600 rounded-md px-4 py-2 hover:bg-blue-50"
                  >
                    I don’t know how to start the exercise
                  </button>
                  <button
                    onClick={() => setInput("Guide me on how to solve the exercise")}
                    className="border border-blue-500 text-blue-600 rounded-md px-4 py-2 hover:bg-blue-50"
                  >
                    Guide me on how to solve the exercise
                  </button>
                  <button
                    onClick={() => setInput("Generate more multiple-choice questions to practice more")}
                    className="border border-blue-500 text-blue-600 rounded-md px-4 py-2 hover:bg-blue-50"
                  >
                    Generate more multiple-choice questions to practice more
                  </button>
                </div>
              </div>
            ) : (
              <>
                {messages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`${
                        m.role === "user"
                          ? "rounded-tr-none bg-green-500 text-white"
                          : "rounded-tl-none bg-gray-100 text-gray-800"
                      } max-w-[80%] rounded-lg p-3 text-sm`}
                    >
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    </div>
                  </div>
                ))}
                {isThinking && (
                  <div className="flex justify-start">
                    <div className="flex items-start gap-2 max-w-[80%]">
                      <img
                        src="/linga.svg"
                        alt="Bot Avatar"
                        className="w-6 h-6 mt-[6px] rounded-full"
                      />
                      <div className="rounded-lg bg-gray-100 text-gray-800 p-3 text-sm flex items-center gap-1">
                        <svg className="w-4 h-4 animate-pulse fill-green-500" viewBox="0 0 8 8">
                          <circle cx="1" cy="4" r="1" />
                          <circle cx="4" cy="4" r="1" />
                          <circle cx="7" cy="4" r="1" />
                        </svg>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Input */}
          <div className="border-t bg-white p-4">
            <div className="flex items-center gap-2">
              <input
                className="flex-1 rounded-md border p-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Type your question…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
              />
              <button
                onClick={sendMessage}
                className="rounded-md bg-green-500 p-2 text-white hover:bg-green-600"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
