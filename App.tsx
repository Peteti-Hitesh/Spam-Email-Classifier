/* eslint-disable jsx-a11y/anchor-is-valid,jsx-a11y/alt-text,jsx-a11y/label-has-associated-control,jsx-a11y/aria-props,jsx-a11y/click-events-have-key-events,jsx-a11y/no-noninteractive-element-interactions,jsx-a11y/no-static-element-interactions */
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Bot, 
  User, 
  Send, 
  Sparkles, 
  Settings, 
  Sliders, 
  Plus, 
  Trash2, 
  RotateCcw, 
  BookOpen, 
  ArrowRight, 
  Search, 
  Code,
  CheckCircle2,
  ShieldCheck,
  Zap,
  HelpCircle,
  FileText,
  BadgeAlert,
  Layers,
  Info,
  Terminal,
  Command,
  Laptop,
  Play,
  Copy,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  DEFAULT_INTENTS, 
  SUGGESTED_QUERIES, 
  Intent 
} from './data';
import { 
  analyzeCustomerQuery, 
  tokenize, 
  NLPResult 
} from './utils';

interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
  nlpResult?: {
    intentId: string;
    intentName: string;
    confidence: number;
    matchedBy: string;
    tokens: string[];
  };
}

export default function App() {
  // -------------------------------------------------------------
  // STATE MANAGEMENT
  // -------------------------------------------------------------
  const [intents, setIntents] = useState<Intent[]>(() => {
    try {
      const saved = localStorage.getItem('sentry_chatbot_intents');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error("Failed to restore intents, using defaults", e);
    }
    return DEFAULT_INTENTS;
  });

  const [activeTab, setActiveTab] = useState<'chat' | 'knowledge' | 'nlp' | 'theory' | 'vscode'>('chat');
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [algorithm, setAlgorithm] = useState<'tfidf' | 'keyword' | 'fuzzy'>('tfidf');
  const [activationThreshold, setActivationThreshold] = useState<number>(0.35);
  const [useStopwords, setUseStopwords] = useState<boolean>(true);
  
  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => {
    return [
      {
        id: 'welcome',
        sender: 'bot',
        text: "Hi there! 👋 Welcome to SentryChat's Customer Service Support Playground. I am powered by a local, completely open, rule-based & TF-IDF Cosine Similarity NLP engine. Type a query, use the quick reply buttons below, or customize my intents database in the right sidebar to test how I route your requests!",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ];
  });
  const [chatInput, setChatInput] = useState<string>('');
  const [isTyping, setIsTyping] = useState<boolean>(false);

  // Selected evaluation state (tracks the NLP breakdown of the LAST user query)
  const [lastNLPResult, setLastNLPResult] = useState<NLPResult | null>(null);

  // Intents configuration forms
  const [selectedIntentId, setSelectedIntentId] = useState<string>('greeting');
  const [newPhraseInput, setNewPhraseInput] = useState<string>('');
  
  // "New Intent" creation form
  const [showAddIntentModal, setShowAddIntentModal] = useState<boolean>(false);
  const [newIntentName, setNewIntentName] = useState<string>('');
  const [newIntentId, setNewIntentId] = useState<string>('');
  const [newIntentResponse, setNewIntentResponse] = useState<string>('');
  const [newIntentPhrases, setNewIntentPhrases] = useState<string>('');
  const [newIntentCategory, setNewIntentCategory] = useState<string>('General');
  const [newIntentColor, setNewIntentColor] = useState<string>('indigo');
  const [formError, setFormError] = useState<string>('');

  const chatEndRef = useRef<HTMLDivElement>(null);
  const realtimeBarRef = useRef<HTMLDivElement | null>(null);
  const thresholdRef = useRef<HTMLDivElement | null>(null);

  // Synchronize state with LocalStorage
  useEffect(() => {
    localStorage.setItem('sentry_chatbot_intents', JSON.stringify(intents));
  }, [intents]);

  // Scroll to bottom of the chat list
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isTyping]);

  // Compute vocabulary size for statistical badge
  const vocabSize = useMemo(() => {
    const allTokens = new Set<string>();
    intents.forEach((intent: Intent) => {
      const combinedText = [intent.name, ...intent.phrases].join(' ');
      tokenize(combinedText, useStopwords).forEach(t => allTokens.add(t));
    });
    return allTokens.size;
  }, [intents, useStopwords]);

  

  // Dynamic analysis helper on user typing to show real-time confidence scores
  const realtimePreviewResult = useMemo(() => {
    if (!chatInput.trim()) return null;
    return analyzeCustomerQuery(chatInput, intents, algorithm, activationThreshold, useStopwords);
  }, [chatInput, intents, algorithm, activationThreshold, useStopwords]);

  useEffect(() => {
    if (realtimeBarRef.current && realtimePreviewResult) {
      const w = `${Math.min(100, realtimePreviewResult.confidence * 100)}%`;
      realtimeBarRef.current.style.setProperty('--w', w);
    }
  }, [realtimePreviewResult]);

  useEffect(() => {
    if (thresholdRef.current) {
      thresholdRef.current.style.setProperty('--left', `${activationThreshold * 100}%`);
    }
  }, [activationThreshold]);

  // -------------------------------------------------------------
  // USER ACTIONS
  // -------------------------------------------------------------
  const handleSendMessage = (textToSend: string) => {
    if (!textToSend.trim()) return;

    // 1. Add User Message
    const userMsgId = `user-${Date.now()}`;
    const timestampStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Dry Run standard calculation metric
    const result = analyzeCustomerQuery(textToSend, intents, algorithm, activationThreshold, useStopwords);
    
    const newUserMessage: ChatMessage = {
      id: userMsgId,
      sender: 'user',
      text: textToSend,
      timestamp: timestampStr,
      nlpResult: {
        intentId: result.winningIntentId,
        intentName: result.winningIntentId === 'fallback' 
          ? 'Fallback Intent' 
          : (intents.find(i => i.id === result.winningIntentId)?.name || 'Unknown'),
        confidence: result.confidence,
        matchedBy: result.matchedBy,
        tokens: result.tokens
      }
    };

    setChatMessages((prev: ChatMessage[]) => [...prev, newUserMessage]);
    setLastNLPResult(result);
    setChatInput('');

    // 2. Trigger Typing animation & Bot Reply
    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);
      
      let replyText = "I'm sorry, I couldn't map your request using our current threshold rules. Could you restate or ask to talk to a representative?";
      if (result.winningIntentId !== 'fallback') {
        const foundIntent = intents.find(i => i.id === result.winningIntentId);
        if (foundIntent) {
          replyText = foundIntent.response;
        }
      }

      const botMsgId = `bot-${Date.now()}`;
      setChatMessages((prev: ChatMessage[]) => [
        ...prev,
        {
          id: botMsgId,
          sender: 'bot',
          text: replyText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }, 850);
  };

  // Add individual custom phrase to active intent settings
  const handleAddNewPhrase = () => {
    if (!newPhraseInput.trim()) return;
    setIntents((prev: Intent[]) => prev.map((intent: Intent) => {
      if (intent.id === selectedIntentId) {
        if (intent.phrases.map((p: string) => p.toLowerCase()).includes(newPhraseInput.toLowerCase().trim())) {
          return intent; // prevent duplicates
        }
        return {
          ...intent,
          phrases: [...intent.phrases, newPhraseInput.trim()]
        };
      }
      return intent;
    }));
    setNewPhraseInput('');
  };

  // Delete phrase from active intent settings
  const handleDeletePhrase = (intentId: string, phraseIdx: number) => {
    setIntents((prev: Intent[]) => prev.map((intent: Intent) => {
      if (intent.id === intentId) {
        const updatedPhrases = [...intent.phrases];
        updatedPhrases.splice(phraseIdx, 1);
        return {
          ...intent,
          phrases: updatedPhrases
        };
      }
      return intent;
    }));
  };

  // Delete an entire intent rule
  const handleDeleteIntent = (intentId: string) => {
    if (intents.length <= 2) {
      alert("At least two intent models are required in the chatbot repository to perform reasonable classifications.");
      return;
    }
    if (window.confirm("Verify: Are you sure you want to delete this support category intent rule permanently?")) {
      setIntents((prev: Intent[]) => prev.filter((i: Intent) => i.id !== intentId));
      if (selectedIntentId === intentId) {
        setSelectedIntentId(intents[0].id);
      }
    }
  };

  // Reset entirely to built-in system default presets
  const handleResetToDefaults = () => {
    if (window.confirm("Restore presets: Are you sure you want to revert all intents and weights to initial baseline settings? Custom additions will be lost.")) {
      setIntents(DEFAULT_INTENTS);
      setSelectedIntentId('greeting');
      setChatMessages([
        {
          id: 'welcome-reset',
          sender: 'bot',
          text: "System database successfully re-synchronized! Intents returned to out-of-the-box support templates. Try asking pricing or shipping status now.",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
      setLastNLPResult(null);
    }
  };

  // Create intent submit validation
  const handleCreateIntent = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!newIntentName.trim() || !newIntentId.trim() || !newIntentResponse.trim()) {
      setFormError("All primary fields (ID, Name, Response copy) must be defined.");
      return;
    }

    const cleanedId = newIntentId.trim().toLowerCase().replace(/\s+/g, '_');
    if (intents.some((i: Intent) => i.id === cleanedId)) {
      setFormError("An intent rule mapping this unique ID identifier already exists.");
      return;
    }

    const phraseList = newIntentPhrases.split('\n')
      .map((p: string) => p.trim())
      .filter((p: string) => p.length > 0);

    const newIntent: Intent = {
      id: cleanedId,
      name: newIntentName.trim(),
      category: newIntentCategory,
      phrases: phraseList.length > 0 ? phraseList : [newIntentName.trim().toLowerCase()],
      response: newIntentResponse.trim(),
      actionType: 'none',
      color: newIntentColor
    };

    setIntents((prev: Intent[]) => [newIntent, ...prev]);
    setSelectedIntentId(cleanedId);
    setShowAddIntentModal(false);
    
    // reset form fields
    setNewIntentId('');
    setNewIntentName('');
    setNewIntentResponse('');
    setNewIntentPhrases('');
    setNewIntentCategory('General');
  };

  const handleCopyCommand = (cmdText: string) => {
    try {
      navigator.clipboard.writeText(cmdText);
      setCopiedText(cmdText);
      setTimeout(() => {
        setCopiedText(null);
      }, 1500);
    } catch (e) {
      console.warn("Could not copy clipboard automatically", e);
    }
  };

  // Helper selector for colors
  const getIntentColorClasses = (colorName: string) => {
    switch (colorName) {
      case 'indigo': return { border: 'border-indigo-200 bg-indigo-50 text-indigo-800', badge: 'bg-indigo-100 text-indigo-800', fill: 'bg-indigo-600', text: 'text-indigo-600' };
      case 'blue': return { border: 'border-blue-200 bg-blue-50 text-blue-800', badge: 'bg-blue-100 text-blue-800', fill: 'bg-blue-600', text: 'text-blue-600' };
      case 'amber': return { border: 'border-amber-200 bg-amber-50 text-amber-800', badge: 'bg-amber-100 text-amber-800', fill: 'bg-amber-600', text: 'text-amber-600' };
      case 'rose': return { border: 'border-rose-200 bg-rose-50 text-rose-800', badge: 'bg-rose-100 text-rose-800', fill: 'bg-rose-600', text: 'text-rose-600' };
      case 'purple': return { border: 'border-purple-200 bg-purple-50 text-purple-800', badge: 'bg-purple-100 text-purple-800', fill: 'bg-purple-600', text: 'text-purple-600' };
      case 'emerald': return { border: 'border-emerald-200 bg-emerald-50 text-emerald-800', badge: 'bg-emerald-100 text-emerald-800', fill: 'bg-emerald-600', text: 'text-emerald-600' };
      default: return { border: 'border-slate-200 bg-slate-50 text-slate-800', badge: 'bg-slate-100 text-slate-800', fill: 'bg-slate-600', text: 'text-slate-600' };
    }
  };

  const currentSelectedIntent = intents.find((i: Intent) => i.id === selectedIntentId) || intents[0];

  return (
    <div className="bg-[#F1F5F9] text-slate-800 min-h-screen flex flex-col font-sans antialiased selection:bg-indigo-150">
      
      {/* HEADER SECTION - GEOMETRIC BALANCE DESIGN */}
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 md:px-8 shrink-0 shadow-xs relative z-20">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-sm">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold tracking-tight text-lg text-slate-900 font-display flex items-center gap-1.5 leading-none">
              SentryChat <span className="font-light text-slate-400">NLP Labs</span>
            </h1>
            <span className="text-[10px] text-slate-450 font-mono text-slate-500 uppercase tracking-widest block mt-0.5">
              Rule & TF-IDF Vector Space Sandbox
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 bg-slate-100 px-3 py-1 rounded-full border border-slate-200 text-2xs font-mono text-slate-600">
            <Zap className="w-3.5 h-3.5 text-indigo-500" />
            Active Vocabulary: <span className="font-bold text-slate-800">{vocabSize} terms</span>
          </div>
          <button 
            onClick={handleResetToDefaults}
            className="px-3.5 py-1.5 border border-slate-300 hover:border-slate-400 bg-white text-slate-755 hover:bg-slate-50 text-xs font-semibold tracking-wide rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title="Restore default database presets"
            id="reset-playground-btn"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            Reset Presets
          </button>
        </div>
      </header>

      {/* CORE FRAMEWORK WORKSPACE */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        
        {/* SIDE BAR CONTROLS (NLP WEIGHTS & THRESHOLDS PANEL) */}
        <aside className="w-full lg:w-80 bg-white border-r border-slate-200 p-5 md:p-6 flex flex-col gap-6 shrink-0 lg:overflow-y-auto">
          
          {/* CONTROL BLOCK I: MATCHING MATH CONTEXT */}
          <div>
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3.5 flex items-center gap-1.5">
              <Code className="w-3.5 h-3.5 text-slate-400" />
              1. Routing Algorithm
            </h3>
            
            <div className="space-y-2">
              <button
                onClick={() => setAlgorithm('tfidf')}
                className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer flex flex-col ${
                  algorithm === 'tfidf'
                    ? 'border-indigo-650 bg-indigo-50/50 border-2 border-indigo-600'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold ${algorithm === 'tfidf' ? 'text-indigo-900' : 'text-slate-800'}`}>
                    TF-IDF Vector Cosine Sim
                  </span>
                  {algorithm === 'tfidf' && <div className="w-2.5 h-2.5 rounded-full bg-indigo-600" />}
                </div>
                <p className="text-[10px] text-slate-450 text-slate-500 mt-1 leading-normal font-sans">
                  Standard term-frequency inverse-document frequency weight cosine scores. Overcomes syntax variance.
                </p>
              </button>

              <button
                onClick={() => setAlgorithm('fuzzy')}
                className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer flex flex-col ${
                  algorithm === 'fuzzy'
                    ? 'border-indigo-650 bg-indigo-50/50 border-2 border-indigo-600'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold ${algorithm === 'fuzzy' ? 'text-indigo-900' : 'text-slate-800'}`}>
                    Levenshtein Fuzzy Match
                  </span>
                  {algorithm === 'fuzzy' && <div className="w-2.5 h-2.5 rounded-full bg-indigo-600" />}
                </div>
                <p className="text-[10px] text-slate-450 text-slate-500 mt-1 leading-normal font-sans">
                  Computes structural edit-distance characters. Ideal for typo tolerance on singular keys or terms.
                </p>
              </button>

              <button
                onClick={() => setAlgorithm('keyword')}
                className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer flex flex-col ${
                  algorithm === 'keyword'
                    ? 'border-indigo-655 bg-indigo-50/50 border-2 border-indigo-600'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold ${algorithm === 'keyword' ? 'text-indigo-900' : 'text-slate-800'}`}>
                    Boolean Overlap Trigger
                  </span>
                  {algorithm === 'keyword' && <div className="w-2.5 h-2.5 rounded-full bg-indigo-600" />}
                </div>
                <p className="text-[10px] text-slate-450 text-slate-500 mt-1 leading-normal font-sans">
                  Stops on direct occurrence or substring inclusion. Brittle, breaks easily under syntax variations.
                </p>
              </button>
            </div>
          </div>

          {/* CONTROL BLOCK II: NLP PARAMETERS */}
          <div className="pt-5 border-t border-slate-100">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-slate-400" />
              2. NLP Thresholds
            </h3>

            <div className="space-y-5">
              {/* Threshold Slider */}
              <div>
                <div className="flex justify-between text-[11px] mb-1.5 font-mono text-slate-550 uppercase">
                  <span>Routing Cutoff:</span>
                  <span className="font-bold text-indigo-700">{(activationThreshold * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0.10"
                  max="0.80"
                  step="0.05"
                  value={activationThreshold}
                  onChange={(e) => setActivationThreshold(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  id="activation-threshold-slider"
                  aria-label="Routing Cutoff"
                />
                <span className="text-[10px] text-slate-450 text-slate-500 block mt-1 leading-normal font-sans">
                  Any match below this score kicks query into the <strong className="text-slate-750 font-bold">fallback response</strong> route.
                </span>
              </div>

              {/* Stopwords Strip Toggle */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Strips Stopwords</span>
                  <span className="text-[10px] text-slate-450 text-slate-500 leading-none">Deletes generic words (e.g., 'the', 'for')</span>
                </div>
                <button
                  onClick={() => setUseStopwords(!useStopwords)}
                  aria-label="Toggle stopwords"
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                    useStopwords ? 'bg-indigo-600' : 'bg-slate-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ${
                      useStopwords ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* REALTIME UTTERANCE SPECTRUM PREVIEW */}
          {realtimePreviewResult && (
            <div className="mt-auto bg-slate-50 border border-slate-200 p-4 rounded-xl">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 font-mono block">
                Live Class Routing Preview
              </span>
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-700 truncate max-w-[140px]">
                    {realtimePreviewResult.winningIntentId === 'fallback' ? '⚠️ Fallback' : `🎯 ${realtimePreviewResult.winningIntentId}`}
                  </span>
                  <span className="font-mono font-bold text-slate-900">
                    {(realtimePreviewResult.confidence * 100).toFixed(0)}% Match
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden flex">
                  <div
                    ref={realtimeBarRef}
                    className={`h-full transition-all duration-300 bar-fill ${
                      realtimePreviewResult.winningIntentId === 'fallback' ? 'bg-amber-400' : 'bg-indigo-600'
                    }`}
                  />
                </div>
                <span className="text-[9px] text-slate-400 block font-mono leading-none">
                  Routing: {realtimePreviewResult.matchedBy.toUpperCase()} Method
                </span>
              </div>
            </div>
          )}

        </aside>

        {/* WORKSTATION VIEW (CHAT & EDUCATION & DEBUG CONSOLE) */}
        <main className="flex-1 flex flex-col min-w-0 bg-[#F8FAFC]">
          
          {/* TAB SHEETS */}
          <div className="h-12 bg-white border-b border-slate-200 flex items-center px-6 gap-6 shrink-0 shadow-3xs">
            <button
              onClick={() => setActiveTab('chat')}
              className={`h-full text-xs font-semibold uppercase tracking-wider border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'chat'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <Bot className="w-4 h-4" />
              💬 Support Sandbox Chat
            </button>

            <button
              onClick={() => setActiveTab('knowledge')}
              className={`h-full text-xs font-semibold uppercase tracking-wider border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'knowledge'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <Layers className="w-4 h-4" />
              🗃️ Training Intents ({intents.length})
            </button>

            <button
              onClick={() => setActiveTab('nlp')}
              className={`h-full text-xs font-semibold uppercase tracking-wider border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'nlp'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <Code className="w-4 h-4" />
              🧪 NLP Telemetry
            </button>

            <button
              onClick={() => setActiveTab('theory')}
              className={`h-full text-xs font-semibold uppercase tracking-wider border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'theory'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              📐 Math Reference
            </button>

            <button
              onClick={() => setActiveTab('vscode')}
              className={`h-full text-xs font-semibold uppercase tracking-wider border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'vscode'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
              id="tab-vscode-btn"
            >
              <Terminal className="w-4 h-4" />
              💻 VS Code Guide
            </button>
          </div>

          {/* TAB CORE PANEL VIEWS */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 flex flex-col gap-6">
            
            {/* VIEW A: CONVERSATION SHUTTLE BAR */}
            {activeTab === 'chat' && (
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch flex-1">
                
                {/* 1. INTERACTIVE CHAT SCREENBOX */}
                <div className="xl:col-span-7 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col min-h-[500px] max-h-[620px]">
                  
                  {/* Chat Header Status Indicator */}
                  <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-2xl">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-xs font-bold text-slate-700 tracking-tight">Active Customer Bot Desk</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-100 uppercase">
                        NLP Engine: {algorithm.toUpperCase()} Mode
                      </span>
                    </div>
                  </div>

                  {/* Messages scroll zone */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    <AnimatePresence initial={false}>
                      {chatMessages.map((msg, idx) => {
                        const isBot = msg.sender === 'bot';
                        return (
                          <motion.div
                            key={msg.id}
                            initial={{ scale: 0.95, opacity: 0, y: 10 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            transition={{ duration: 0.25 }}
                            className={`flex flex-col ${isBot ? 'items-start' : 'items-end'}`}
                          >
                            <div className={`flex gap-2.5 max-w-[85%] ${isBot ? 'flex-row' : 'flex-row-reverse'}`}>
                              
                              {/* Avatar design */}
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-2xs ${
                                isBot 
                                  ? 'bg-indigo-600 text-white' 
                                  : 'bg-emerald-500 text-white'
                              }`}>
                                {isBot ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                              </div>

                              <div>
                                <div className={`p-3.5 rounded-2xl text-sm leading-relaxed ${
                                  isBot
                                    ? 'bg-slate-100 text-slate-800 rounded-tl-none'
                                    : 'bg-indigo-600 text-white rounded-tr-none'
                                } shadow-3xs`}>
                                  {msg.text}
                                </div>

                                {/* Mathematical analysis metadata below user's message bubble */}
                                {!isBot && msg.nlpResult && (
                                  <div className="flex items-center gap-2 mt-1.5 text-[9px] font-mono text-slate-400 justify-end">
                                    <span className="uppercase">Match Route:</span>
                                    <span className={`font-semibold bg-slate-100 px-1.5 py-0.2 rounded border border-slate-250 text-slate-700 ${
                                      msg.nlpResult.intentId === 'fallback' ? 'text-rose-600 bg-rose-50 border-rose-100' : ''
                                    }`}>
                                      {msg.nlpResult.intentId === 'fallback' ? 'Fallback' : msg.nlpResult.intentId}
                                    </span>
                                    <span>•</span>
                                    <span>Score:</span>
                                    <span className="font-bold text-slate-600">
                                      {(msg.nlpResult.confidence * 100).toFixed(0)}%
                                    </span>
                                    <span>•</span>
                                    <button 
                                      onClick={() => {
                                        setActiveTab('nlp');
                                      }}
                                      className="text-indigo-600 hover:underline flex items-center gap-0.5"
                                      title="Inspect mathematical matrix vector weights"
                                    >
                                      Inspect <ArrowRight className="w-2.5 h-2.5" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>

                    {isTyping && (
                      <div className="flex gap-2.5 items-center">
                        <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-3xs">
                          <Bot className="w-4 h-4" />
                        </div>
                        <div className="bg-slate-100 text-slate-400 px-4 py-2.5 rounded-2xl rounded-tl-none flex items-center gap-1 shadow-3xs">
                          <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-0" />
                          <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-150" />
                          <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-300" />
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  {/* QUICK REPLY TRIGGER MATRIX */}
                  <div className="p-3 border-t border-slate-100 bg-slate-50 flex flex-col gap-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-mono">
                      📚 Click to Trigger Quick Simulated Queries:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {SUGGESTED_QUERIES.map((query, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSendMessage(query)}
                          className="text-2xs bg-white hover:bg-slate-100 border border-slate-200 hover:border-slate-350 text-slate-700 font-medium py-1.5 px-3 rounded-lg cursor-pointer transition-all shadow-3xs"
                        >
                          "{query}"
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Message Input box */}
                  <div className="p-4 border-t border-slate-150">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleSendMessage(chatInput);
                      }}
                      className="flex gap-2"
                    >
                      <input
                        type="text"
                        placeholder="Type standard customer queries, e.g., 'How long until my delivery arrives?'..."
                        className="flex-1 bg-slate-50 hover:bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-800 transition-all focus:outline-none focus:border-indigo-600 focus:bg-white shadow-3xs"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        id="chat-query-input"
                      />
                      <button
                        type="submit"
                        className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-4.5 py-3 flex items-center justify-center cursor-pointer transition-all hover:scale-[1.02] shadow-sm shrink-0"
                        title="Dispatch Query"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </form>
                  </div>

                </div>

                {/* 2. REAL-TIME MULTI-MATCH SPECTRUM PANEL */}
                <div className="xl:col-span-5 flex flex-col gap-5">
                  
                  {/* METRIC BREAKDOWN INTENTS LIST */}
                  <div className="bg-white border border-slate-200 p-5 md:p-6 rounded-2xl shadow-sm flex flex-col gap-4 flex-1">
                    <div className="border-b border-slate-100 pb-3">
                      <h4 className="text-xs font-bold text-slate-450 text-slate-500 uppercase font-mono tracking-widest">
                        Real-Time Matching Spectrum
                      </h4>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                        Compared probability metrics across active classifier intents library.
                      </p>
                    </div>

                    {lastNLPResult ? (
                      <div className="space-y-4 overflow-y-auto max-h-[380px] pr-1.5">
                        
                        {/* Winner Highlights Card */}
                        <div className={`p-4 rounded-xl border flex items-center justify-between ${
                          lastNLPResult.winningIntentId === 'fallback'
                            ? 'bg-amber-50 border-amber-200 text-amber-800'
                            : 'bg-indigo-50 border-indigo-200 text-indigo-900'
                        }`}>
                          <div>
                            <span className="text-[9px] font-mono font-bold uppercase block opacity-80">
                              Winning Intent Target Route
                            </span>
                            <span className="text-sm font-semibold block uppercase">
                              {lastNLPResult.winningIntentId === 'fallback' ? '⚠️ Fallback Activated' : `🎯 Category: ${lastNLPResult.winningIntentId}`}
                            </span>
                            <span className="text-[9px] font-mono opacity-80 block mt-0.5">
                              Processing Algorithm Applied: {lastNLPResult.matchedBy.toUpperCase()}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-2xs font-mono block uppercase opacity-80">Confidence</span>
                            <span className="text-xl font-bold font-mono">
                              {(lastNLPResult.confidence * 100).toFixed(0)}%
                            </span>
                          </div>
                        </div>

                        {/* List Spectrum of all scores */}
                        <div className="space-y-3.5">
                          {lastNLPResult.intentScores.map((scoreItem) => {
                            const isWin = scoreItem.intentId === lastNLPResult.winningIntentId;
                            const isAboveCutoff = scoreItem.score >= activationThreshold;
                            return (
                              <div key={scoreItem.intentId} className="space-y-1">
                                <div className="flex justify-between text-xs items-center">
                                  <span className={`font-semibold truncate max-w-[200px] ${isWin ? 'text-indigo-700 font-bold' : 'text-slate-650'}`}>
                                    {scoreItem.intentName}
                                  </span>
                                  <div className="flex items-center gap-1.5 font-mono text-[11px] font-semibold text-slate-700">
                                    <span>{(scoreItem.score * 100).toFixed(0)}%</span>
                                    {scoreItem.score >= activationThreshold ? (
                                      <span className="text-[9px] text-emerald-600 bg-emerald-50 px-1 rounded font-normal font-sans">Passes</span>
                                    ) : (
                                      <span className="text-[9px] text-rose-600 bg-rose-50 px-1 rounded font-normal font-sans">Fails</span>
                                    )}
                                  </div>
                                </div>
                                
                                {/* Geometric slider spectrum bar */}
                                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden relative border border-slate-205">
                                  {/* Draw Threshold cutoff overlay marker */}
                                  <div
                                    ref={thresholdRef}
                                    className="absolute top-0 bottom-0 w-0.5 bg-rose-450 bg-rose-500 z-10 threshold-marker"
                                    title={`Cutoff Threshold: ${(activationThreshold * 100)}%`}
                                  />
                                  <div 
                                    className={`h-full transition-all duration-300 bar-fill ${
                                      isWin 
                                        ? 'bg-indigo-600' 
                                        : isAboveCutoff 
                                          ? 'bg-indigo-400' 
                                          : 'bg-slate-300'
                                    }`}
                                    ref={(el) => { if (el) el.style.setProperty('--w', `${Math.min(100, scoreItem.score * 100)}%`); }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>

                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center py-16 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl p-6">
                        <HelpCircle className="w-10 h-10 text-slate-300 mb-2.5" />
                        <span className="text-xs font-mono font-bold uppercase">No message processed yet</span>
                        <p className="text-2xs text-slate-500 max-w-[220px] mt-1.5">
                          Type a support inquiry in the chat sandbox or click a simulated query template to observe vector scoring.
                        </p>
                      </div>
                    )}

                  </div>

                </div>

              </div>
            )}

            {/* VIEW B: TRAINING KNOWLEDGE BASE */}
            {activeTab === 'knowledge' && (
              <div className="space-y-6">
                
                {/* INSTRUCTION DECK */}
                <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-bold text-indigo-650 uppercase font-mono tracking-wider block">
                      Chatbot Routing Source Corpus Table
                    </span>
                    <h2 className="text-sm font-bold text-slate-800 font-display mt-0.5">
                      Configure Category Triggers & Action Logs
                    </h2>
                    <p className="text-[10px] text-slate-450 leading-relaxed max-w-2xl mt-1 text-slate-500 font-mono">
                      Add, delete, or refine sample phrasing. The TF-IDF model calculates probability matrices directly based on how you modify this table.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowAddIntentModal(true)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold py-2.5 px-4.5 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs transition-transform hover:scale-[1.02] shrink-0 font-sans"
                  >
                    <Plus className="w-4 h-4" />
                    New Intent Rule
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  
                  {/* INTENT SIDE MENU (1/3) */}
                  <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl shadow-sm p-4 space-y-2 max-h-[500px] overflow-y-auto">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block px-2 mb-2 font-mono">
                      Category Intent Dictionary
                    </span>
                    {intents.map((intent) => {
                      const isActive = intent.id === selectedIntentId;
                      const colSetup = getIntentColorClasses(intent.color);
                      return (
                        <div
                          key={intent.id}
                          onClick={() => setSelectedIntentId(intent.id)}
                          className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                            isActive
                              ? `border-slate-800 bg-slate-900 text-white font-semibold shadow-xs`
                              : 'border-slate-150 bg-slate-50/50 hover:bg-slate-50 text-slate-800'
                          }`}
                        >
                          <div>
                            <span className="text-xs block font-bold">
                              {intent.name}
                            </span>
                            <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded mt-1.5 inline-block ${
                              isActive ? 'bg-indigo-850 bg-slate-800 text-slate-300' : colSetup.badge
                            }`}>
                              ID: {intent.id} • {intent.phrases.length} phrases
                            </span>
                          </div>
                          {!isActive && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteIntent(intent.id);
                              }}
                              className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Delete intent rule permanently"
                              aria-label="Delete intent"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* ACTIVE INTENT SETTINGS BOX (2/3) */}
                  <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl shadow-sm p-5 md:p-6 flex flex-col gap-6">
                    
                    {/* Active intent title heading */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 pb-4 gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-black ${getIntentColorClasses(currentSelectedIntent.color).badge}`}>
                            {currentSelectedIntent.category}
                          </span>
                          <span className="text-2xs font-mono text-slate-400">ID: {currentSelectedIntent.id}</span>
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 font-display mt-1">
                          {currentSelectedIntent.name}
                        </h3>
                      </div>
                    </div>

                    {/* Response copy pane */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-mono">
                        📋 Bot Text Action Copy Response:
                      </span>
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-205 text-sm text-slate-700 leading-relaxed whitespace-pre-line italic">
                        "{currentSelectedIntent.response}"
                      </div>
                    </div>

                    {/* Current matching phrase tokens lists */}
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-mono">
                          🔑 Active Training Triggers ({currentSelectedIntent.phrases.length}):
                        </span>
                        <span className="text-[9px] text-slate-400 font-mono">Used for vector overlap computation</span>
                      </div>

                      <div className="flex flex-wrap gap-1.5 max-h-[160px] overflow-y-auto pr-1">
                        {currentSelectedIntent.phrases.map((phrase, idx) => (
                          <div 
                            key={idx} 
                            className="bg-slate-100 border border-slate-200 pl-2.5 pr-1.5 py-1 rounded-lg text-xs font-semibold text-slate-700 flex items-center gap-1.5 group hover:border-slate-300"
                          >
                            <span>"{phrase}"</span>
                            <button
                              onClick={() => handleDeletePhrase(currentSelectedIntent.id, idx)}
                              className="text-slate-400 hover:text-rose-600 rounded p-0.5 group-hover:opacity-100 transition-opacity"
                              title="Delete phrases trigger"
                            >
                              <XIcon className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>

                      {/* Add new phrases fields */}
                      <div className="flex gap-2 pt-2">
                        <input
                          type="text"
                          placeholder="Add custom mapping phrase, e.g., 'Do you have refund policies?'..."
                          className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-600"
                          value={newPhraseInput}
                          onChange={(e) => setNewPhraseInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleAddNewPhrase();
                            }
                          }}
                          id="new-phrase-input"
                        />
                        <button
                          onClick={handleAddNewPhrase}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-3.5 py-1.5 rounded-lg cursor-pointer flex items-center gap-1 shrink-0 transition-all font-sans"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Add Link
                        </button>
                      </div>

                    </div>

                  </div>

                </div>

              </div>
            )}

            {/* VIEW C: MATHEMATICAL DEBUGGER TELEMETRY */}
            {activeTab === 'nlp' && (
              <div className="space-y-6">
                
                {/* INSTRUCTION DECK */}
                <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
                  <span className="text-[10px] font-bold text-indigo-650 uppercase font-mono tracking-wider block">
                    Mathematical Evaluation Telemetry Dashboard
                  </span>
                  <h2 className="text-sm font-bold text-slate-800 font-display mt-0.5">
                    Step-by-Step Computational Visualizer
                  </h2>
                  <p className="text-[10px] text-slate-450 mt-1 max-w-3xl leading-relaxed text-slate-500 font-mono">
                    Inspect how customer strings compile into raw tokens, strip connector stopwords, evaluate document TF-IDF ratios, and compute vector similarity scores dynamically.
                  </p>
                </div>

                {lastNLPResult ? (
                  <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
                    
                    {/* BENTO BOX 1: TEXT PREPROCESSING (XL Column 6) */}
                    <div className="xl:col-span-6 bg-white border border-slate-200 p-5 md:p-6 rounded-2xl shadow-sm flex flex-col gap-4">
                      <div className="border-b border-slate-100 pb-2 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-indigo-600" />
                        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide font-display">
                          Step 1: Raw Utterance Prep Pipeline
                        </h4>
                      </div>

                      <div className="space-y-4 text-xs flex-1">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-mono">
                            Input Query Stream:
                          </span>
                          <p className="p-3 bg-slate-50 border border-slate-205 rounded-xl font-medium text-slate-800 mt-1 leading-relaxed">
                            "{lastNLPResult.preprocessingSteps.raw}"
                          </p>
                        </div>

                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-mono">
                            A. Letter Case Normalization:
                          </span>
                          <p className="p-2.5 bg-slate-50 border border-slate-205 rounded-lg text-slate-600 mt-1 font-mono text-[11px] leading-relaxed">
                            "{lastNLPResult.preprocessingSteps.lowercased}"
                          </p>
                        </div>

                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-mono">
                            B. Punctuation Strip & Initial Splitting:
                          </span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {lastNLPResult.preprocessingSteps.tokenized.length === 0 ? (
                              <span className="text-slate-400 italic">No initial terms found.</span>
                            ) : (
                              lastNLPResult.preprocessingSteps.tokenized.map((tok, idx) => (
                                <span key={idx} className="bg-slate-100 px-2 py-0.5 rounded text-[11px] font-mono border border-slate-200 text-slate-750">
                                  "{tok}"
                                </span>
                              ))
                            )}
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-mono">
                              C. Stopwords Extracted:
                            </span>
                            <span className="text-[9px] text-slate-400 italic font-mono">Stops noise tokens</span>
                          </div>
                          
                          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                            <div className="flex flex-wrap gap-1.5">
                              {/* Show which tokens remain vs which are deleted */}
                              {lastNLPResult.preprocessingSteps.tokenized.map((tok, idx) => {
                                const isSoftDeleted = useStopwords && !lastNLPResult.tokens.includes(tok);
                                return (
                                  <span 
                                    key={idx} 
                                    className={`px-2 py-0.5 rounded text-[11px] font-mono border ${
                                      isSoftDeleted
                                        ? 'bg-rose-50 border-rose-200 text-rose-500 line-through'
                                        : 'bg-emerald-50 border-emerald-200 text-emerald-800 font-bold'
                                    }`}
                                    title={isSoftDeleted ? "Stopword deleted" : "Preprocessed token active"}
                                  >
                                    {tok}
                                  </span>
                                );
                              })}
                            </div>
                            <span className="text-[9px] text-slate-400 block font-mono leading-none pt-0.5">
                              Remaining TF active vocabulary features: {lastNLPResult.tokens.length} terms.
                            </span>
                          </div>
                        </div>

                      </div>
                    </div>

                    {/* BENTO BOX 2: VECTOR WEIGHTS INVERSE LOG MATRIX (XL Column 6) */}
                    <div className="xl:col-span-6 bg-white border border-slate-200 p-5 md:p-6 rounded-2xl shadow-sm flex flex-col gap-4">
                      
                      <div className="border-b border-slate-100 pb-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Code className="w-4 h-4 text-indigo-600" />
                          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide font-display">
                            Step 2: Vector Matrix Term Weights
                          </h4>
                        </div>
                        <span className="text-[10px] font-mono font-bold text-slate-400">
                          LOG SCALE IDF MATRIX
                        </span>
                      </div>

                      <div className="space-y-4 flex-1">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-mono mb-2">
                            Token Dimensionality & IDF Scores:
                          </span>
                          
                          {Object.keys(lastNLPResult.metricsBreakdown.idfScores).length === 0 ? (
                            <div className="text-center py-12 text-slate-400 text-xs font-mono">
                              No intersection words available in the current intent vocabulary index. Or algorithm is not in TF-IDF mode.
                            </div>
                          ) : (
                            <div className="space-y-3 max-h-[290px] overflow-y-auto pr-1">
                              {Object.keys(lastNLPResult.metricsBreakdown.idfScores).map((term) => {
                                const idfVal = lastNLPResult.metricsBreakdown.idfScores[term] || 0;
                                const qWeight = lastNLPResult.metricsBreakdown.queryVector[term] || 0;
                                const iWeight = lastNLPResult.metricsBreakdown.intentVector[term] || 0;
                                return (
                                  <div key={term} className="p-3 bg-slate-50 border border-slate-205 rounded-xl space-y-1.5 font-mono">
                                    <div className="flex justify-between items-center text-xs font-bold">
                                      <span className="text-indigo-700">"{term}"</span>
                                      <span className="text-slate-600 text-[11px]">IDF Weight: {idfVal.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-[10px] text-slate-450 border-t border-slate-100 pt-1">
                                      <span>TF(Query): {qWeight > 0 ? (qWeight / idfVal).toFixed(0) : 0} • tf-idf: {qWeight.toFixed(2)}</span>
                                      <span>TF(Intent): {iWeight > 0 ? (iWeight / idfVal).toFixed(0) : 0} • tf-idf: {iWeight.toFixed(2)}</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {lastNLPResult.metricsBreakdown.matchingTerms.length > 0 && (
                          <div className="bg-emerald-50 border border-emerald-250 p-3 rounded-xl flex items-center gap-2 text-2xs font-mono text-emerald-800">
                            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                            <div>
                              <span>Matched Vocabulary Intersections: </span>
                              <strong>{lastNLPResult.metricsBreakdown.matchingTerms.map(t => `"${t}"`).join(', ')}</strong>
                            </div>
                          </div>
                        )}

                      </div>
                    </div>

                  </div>
                ) : (
                  <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-16 text-center text-slate-400 flex flex-col items-center justify-center">
                    <Code className="w-12 h-12 text-slate-300 mb-2.5 animate-pulse" />
                    <span className="text-xs font-mono font-bold uppercase block text-slate-400">
                      Debugger is Idle
                    </span>
                    <p className="text-2xs text-slate-500 max-w-sm mt-1.5 leading-relaxed">
                      You must message the support chatbot first. Once a query is entered, its complete step-by-step vector weights, preprocessed tokens, and similarity calculations are visualised here.
                    </p>
                  </div>
                )}

              </div>
            )}

            {/* VIEW D: MATH THEORY REFERENCE BOOK */}
            {activeTab === 'theory' && (
              <div className="space-y-6">
                
                {/* INTERACTIVE GUIDE */}
                <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
                  <div>
                    <span className="text-[10px] font-bold text-indigo-650 uppercase font-mono tracking-wider block">
                      Educational Reference Book
                    </span>
                    <h2 className="text-base font-bold text-slate-900 font-display">
                      How Rule-Based & TF-IDF Similarity Chatbots Work
                    </h2>
                    <p className="text-xs text-slate-500 leading-relaxed mt-1">
                      Traditional chatbots do not possess large language understanding models. Instead, they transform human inputs into mathematical coordinate vectors to classify intent, routing user messages using statistical criteria.
                    </p>
                  </div>

                  {/* FORMULA EXPANSION ACROSS SPEC SHEETS */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch pt-2">
                    
                    {/* MATH CARD 1: COSINE VECTOR SCORING */}
                    <div className="border border-slate-200 rounded-xl p-5 flex flex-col gap-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                        <h4 className="text-xs font-bold text-slate-800 uppercase font-mono tracking-wider">
                          I. Cosine Similarity Formula
                        </h4>
                      </div>
                      <p className="text-2xs text-slate-500 leading-normal">
                        Cosine similarity measures the orientation gap between two positive weighting vectors across multidimensional token space. Distinct from magnitude distance, it calculates the angular direction similarity.
                      </p>
                      <div className="my-2 bg-slate-50 p-4 rounded-xl text-center border border-slate-200 text-sm font-mono select-all">
                        {"CosineSim(Q, I) = (Q • I) / (||Q|| ||I||)"}
                      </div>
                      <p className="text-2xs text-slate-500 leading-normal font-sans">
                        Where <span className="font-mono text-[10px]">Q • I</span> is the vector dot-product sum <span className="font-mono text-[10px]">sum(Q_k * I_k)</span>, and <span className="font-mono text-[10px]">||V||</span> is the Euclidean Euclidean magnitude length calculated by taking the square root of the sum of squared weights.
                      </p>
                    </div>

                    {/* MATH CARD 2: TF-IDF WEIGHTS */}
                    <div className="border border-slate-200 rounded-xl p-5 flex flex-col gap-3">
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-indigo-650 shrink-0" />
                        <h4 className="text-xs font-bold text-slate-800 uppercase font-mono tracking-wider">
                          II. TF-IDF Calculations
                        </h4>
                      </div>
                      <p className="text-2xs text-slate-500 leading-normal">
                        Term Frequency penalizes redundancy, while Inverse Document Frequency dampens high prevalence universal terms (like 'how', 'is', 'get') to scale unique indicator identifiers.
                      </p>
                      <div className="my-2 bg-slate-50 p-4 rounded-xl text-center border border-slate-200 text-sm font-mono select-all">
                        {"IDF(t) = ln(1 + (|D| / DF(t))) + 1.0"}
                      </div>
                      <p className="text-2xs text-slate-500 leading-normal font-sans">
                        Rare terms contained only in single intent training rules get boosted mathematical multipliers. This ensures spelling "refund" immediately targets refunds, despite standard surrounding noise phrasing.
                      </p>
                    </div>

                  </div>

                  {/* CONCEPT SYNOPSIS ROW */}
                  <div className="border-t border-slate-150 pt-4 mt-2">
                    <h4 className="text-xs font-bold text-slate-800 uppercase mb-2 block">
                      Why does Keyword Routing fail in Customer Service?
                    </h4>
                    <p className="text-2xs text-slate-550 leading-relaxed max-w-4xl text-slate-500">
                      Simple keyword-matching engines lack semantic representation. Under standard rules, negations (e.g., "I do <strong className="text-slate-700">NOT</strong> want to upgrade my subscription") trigger false positive alignments (pricing plan greetings) because words like "subscription" overlay. State-of-the-art simple NLP models mitigate this by configuring sliding confidence thresholds and stripping connector stopword noise.
                    </p>
                  </div>

                </div>

              </div>
            )}

            {activeTab === 'vscode' && (
              <div className="space-y-6">
                
                {/* Introduction Banner */}
                <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-bold text-indigo-650 uppercase font-mono tracking-wider block font-black">
                      Local Development Suite & VS Code Guide
                    </span>
                    <h2 className="text-sm font-bold text-slate-800 font-display mt-0.5">
                      Open, Develop, and Debug in Microsoft VS Code
                    </h2>
                    <p className="text-[10px] text-slate-450 leading-relaxed max-w-2xl mt-1 text-slate-500 font-mono">
                      Learn how to set up, operate, lint, compile, and refine this SentryChat NLP local playground inside your offline code editors!
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold bg-indigo-50 border border-indigo-250 text-indigo-700 px-3 py-1.5 rounded-xl block">
                      Compatible with VS Code 1.80+
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                  
                  {/* LEFT: CLI Commands Workbench (Column 7) */}
                  <div className="xl:col-span-7 space-y-6">
                    
                    {/* Command terminal block */}
                    <div className="bg-slate-900 border border-slate-850 rounded-2xl p-5 md:p-6 text-white shadow-md space-y-4">
                      
                      <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                        <div className="flex items-center gap-2 font-mono text-xs">
                          <div className="flex gap-1.5">
                            <span className="w-3 h-3 rounded-full bg-rose-500 block" />
                            <span className="w-3 h-3 rounded-full bg-amber-500 block" />
                            <span className="w-3 h-3 rounded-full bg-emerald-500 block" />
                          </div>
                          <span className="text-slate-400 font-bold ml-1.5 font-mono">bash — local-chatbot-terminal</span>
                        </div>
                        <span className="text-[10px] uppercase font-mono text-indigo-450 text-indigo-400 font-semibold tracking-wider">Shell Helper</span>
                      </div>

                      <p className="text-xs text-slate-300 font-sans leading-relaxed">
                        Execute these commands in your VS Code integrated terminal (<code className="bg-slate-800 px-1.5 py-0.5 rounded text-white font-mono">Ctrl+`</code>) to successfully run your chatbot engine locally on your machine:
                      </p>

                      <div className="space-y-4 pt-1">
                        
                        {/* Command 1 */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 uppercase">
                            <span>1. INSTALL ALL DEPENDENCIES (node_modules)</span>
                            <span className="text-rose-450 font-bold">Highly Critical First Step</span>
                          </div>
                          <div className="flex items-center bg-slate-950 rounded-xl p-3 border border-slate-800 select-all font-mono text-xs md:text-sm text-emerald-400 font-semibold justify-between">
                            <span>npm install</span>
                            <button
                              type="button"
                              onClick={() => handleCopyCommand('npm install')}
                              className="text-slate-400 hover:text-white p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                              title="Copy command to clipboard"
                            >
                              {copiedText === 'npm install' ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                  <span className="text-[9px] uppercase font-sans font-bold text-emerald-400">Copied</span>
                                </>
                              ) : (
                                <Copy className="w-3.5 h-3.5 text-slate-400" />
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Command 2 */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 uppercase">
                            <span>2. BOOT UP FRONTEND VITE DEV SERVER</span>
                            <span className="text-indigo-400 font-bold">Launches Local Interactive Sandbox</span>
                          </div>
                          <div className="flex items-center bg-slate-950 rounded-xl p-3 border border-slate-800 select-all font-mono text-xs md:text-sm text-emerald-400 font-semibold justify-between">
                            <span>npm run dev</span>
                            <button
                              type="button"
                              onClick={() => handleCopyCommand('npm run dev')}
                              className="text-slate-400 hover:text-white p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                              title="Copy command to clipboard"
                            >
                              {copiedText === 'npm run dev' ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                  <span className="text-[9px] uppercase font-sans font-bold text-emerald-400">Copied</span>
                                </>
                              ) : (
                                <Copy className="w-3.5 h-3.5 text-slate-400" />
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Command 3 */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 uppercase">
                            <span>3. COMPILE PRODUCTION CONSOLE</span>
                            <span className="text-slate-400">Validates TypeScript types and bundler maps</span>
                          </div>
                          <div className="flex items-center bg-slate-950 rounded-xl p-3 border border-slate-800 select-all font-mono text-xs md:text-sm text-emerald-400 font-semibold justify-between">
                            <span>npm run build</span>
                            <button
                              type="button"
                              onClick={() => handleCopyCommand('npm run build')}
                              className="text-slate-400 hover:text-white p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                              title="Copy command to clipboard"
                            >
                              {copiedText === 'npm run build' ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                  <span className="text-[9px] uppercase font-sans font-bold text-emerald-400">Copied</span>
                                </>
                              ) : (
                                <Copy className="w-3.5 h-3.5 text-slate-400" />
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Command 4 */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 uppercase">
                            <span>4. RUN LINTER CODE AUDIT</span>
                            <span className="text-slate-400">Catches type mismatch or syntax inconsistencies</span>
                          </div>
                          <div className="flex items-center bg-slate-950 rounded-xl p-3 border border-slate-800 select-all font-mono text-xs md:text-sm text-emerald-400 font-semibold justify-between">
                            <span>npm run lint</span>
                            <button
                              type="button"
                              onClick={() => handleCopyCommand('npm run lint')}
                              className="text-slate-400 hover:text-white p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                              title="Copy command to clipboard"
                            >
                              {copiedText === 'npm run lint' ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                  <span className="text-[9px] uppercase font-sans font-bold text-emerald-400">Copied</span>
                                </>
                              ) : (
                                <Copy className="w-3.5 h-3.5 text-slate-400" />
                              )}
                            </button>
                          </div>
                        </div>

                      </div>
                    </div>

                    {/* Troubleshooting Card */}
                    <div className="bg-white border border-slate-200 p-5 md:p-6 rounded-2xl shadow-sm space-y-4">
                      <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                        <BadgeAlert className="w-4.5 h-4.5 text-amber-500" />
                        <h4 className="text-xs font-bold text-slate-800 uppercase font-mono tracking-wider">
                          VS Code Troubleshooting Manual
                        </h4>
                      </div>
                      
                      <div className="space-y-3.5 text-xs text-slate-650 leading-relaxed">
                        <div>
                          <strong className="text-slate-900 block mb-1">💡 Error: "command not found: npm"</strong>
                          <p className="text-slate-500 leading-normal">
                            This means the Node.js compiler environment is missing from your native path. Go to <a href="https://nodejs.org" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline inline-flex items-center gap-0.5 font-bold">nodejs.org <ArrowRight className="w-3 h-3" /></a>, install the LTS compilation program, restart VS Code entirely, and execute the dependencies installer command again.
                          </p>
                        </div>
                        <div className="border-t border-slate-100 pt-3.5">
                          <strong className="text-slate-900 block mb-1">💡 Port 3000 In Use Conflict</strong>
                          <p className="text-slate-500 leading-normal">
                            If your sandbox fails because port 3000 is occupied by another local applet, edit the <code className="bg-slate-150 px-1 rounded font-mono text-2xs text-slate-800">vite.config.ts</code> configuration file in VS Code to specify a custom port number like <code className="bg-slate-150 px-1 rounded font-mono text-2xs text-slate-800">8000</code>.
                          </p>
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* RIGHT: VS Code Shortcuts Cheat-Sheet, Recommended Extensions, Directory Map (Column 5) */}
                  <div className="xl:col-span-5 space-y-6">
                    
                    {/* KEYBOARD SHORTCUTS PALETTE */}
                    <div className="bg-white border border-slate-200 p-5 md:p-6 rounded-2xl shadow-sm space-y-4">
                      
                      <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <Command className="w-4 h-4 text-indigo-600" />
                          <h4 className="text-xs font-bold text-slate-800 uppercase font-mono tracking-wider">
                            VS Code Keyboard Hotkeys
                          </h4>
                        </div>
                        <span className="text-[9px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-250 uppercase font-bold">Standard</span>
                      </div>

                      <div className="space-y-3.5 text-xs">
                        
                        <div className="flex justify-between items-center p-2 bg-slate-50 border border-slate-150 rounded-xl transition-all">
                          <span className="text-slate-700 font-semibold font-sans">Open Command Palette</span>
                          <span className="font-mono text-2xs font-bold bg-white border border-slate-250 px-2 py-0.5 rounded shadow-2xs text-slate-850">
                            Ctrl + Shift + P
                          </span>
                        </div>

                        <div className="flex justify-between items-center p-2 bg-slate-50 border border-slate-150 rounded-xl transition-all">
                          <span className="text-slate-700 font-semibold font-sans">Toggle Terminal toggle</span>
                          <span className="font-mono text-2xs font-bold bg-white border border-slate-250 px-2 py-0.5 rounded shadow-2xs text-slate-850">
                            Ctrl + `
                          </span>
                        </div>

                        <div className="flex justify-between items-center p-2 bg-slate-50 border border-slate-150 rounded-xl transition-all">
                          <span className="text-slate-700 font-semibold font-sans">File Navigator Finder</span>
                          <span className="font-mono text-2xs font-bold bg-white border border-slate-250 px-2 py-0.5 rounded shadow-2xs text-slate-850">
                            Ctrl + P
                          </span>
                        </div>

                        <div className="flex justify-between items-center p-2 bg-slate-50 border border-slate-150 rounded-xl transition-all">
                          <span className="text-slate-700 font-semibold font-sans">Format Code Document</span>
                          <span className="font-mono text-2xs font-bold bg-white border border-slate-250 px-2 py-0.5 rounded shadow-2xs text-slate-850">
                            Shift + Alt + F
                          </span>
                        </div>

                        <div className="flex justify-between items-center p-2 bg-slate-50 border border-slate-150 rounded-xl transition-all">
                          <span className="text-slate-700 font-semibold font-sans">Split Workspace View</span>
                          <span className="font-mono text-2xs font-bold bg-white border border-slate-250 px-2 py-0.5 rounded shadow-2xs text-slate-850">
                            Ctrl + \
                          </span>
                        </div>

                      </div>
                    </div>

                    {/* RECOMMENDED EXTENSIONS PACK */}
                    <div className="bg-white border border-slate-200 p-5 md:p-6 rounded-2xl shadow-sm space-y-4">
                      
                      <div className="border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-indigo-500 animate-pulse" />
                          <h4 className="text-xs font-bold text-slate-800 uppercase font-mono tracking-wider">
                            Helper Extension Recommendations
                          </h4>
                        </div>
                      </div>

                      <div className="space-y-4 text-xs leading-normal">
                        
                        <div className="flex gap-3">
                          <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 shrink-0 text-blue-700 font-bold font-mono flex items-center justify-center text-xs">
                            Tail
                          </div>
                          <div>
                            <strong className="text-slate-800 block leading-tight font-black">Tailwind CSS IntelliSense</strong>
                            <p className="text-slate-500 text-2xs mt-0.5 font-mono">Auto-completes class identifiers instantly with visual colors.</p>
                          </div>
                        </div>

                        <div className="flex gap-3 pt-3.5 border-t border-slate-100">
                          <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 shrink-0 text-indigo-700 font-bold font-mono flex items-center justify-center text-xs">
                            ES
                          </div>
                          <div>
                            <strong className="text-slate-800 block leading-tight font-black">ESLint & TS Tooling</strong>
                            <p className="text-slate-500 text-2xs mt-0.5 font-mono">Warns of missing imports or dead variables on visual panels.</p>
                          </div>
                        </div>

                        <div className="flex gap-3 pt-3.5 border-t border-slate-100">
                          <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 shrink-0 text-amber-700 font-bold font-mono flex items-center justify-center text-xs">
                            Pre
                          </div>
                          <div>
                            <strong className="text-slate-800 block leading-tight font-black">Prettier Formatter</strong>
                            <p className="text-slate-500 text-2xs mt-0.5 font-mono">Enforces standard spacing alignment automatically on save copy.</p>
                          </div>
                        </div>

                      </div>
                    </div>

                    {/* FOLDER MAP */}
                    <div className="bg-white border border-slate-200 p-5 md:p-6 rounded-2xl shadow-sm space-y-4">
                      
                      <div className="border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-slate-400" />
                          <h4 className="text-xs font-bold text-slate-800 uppercase font-mono tracking-wider">
                            Chatbot Workspace map
                          </h4>
                        </div>
                      </div>

                      <div className="font-mono text-2xs space-y-1.5 text-slate-500 leading-normal">
                        <div>📁 <strong className="text-indigo-805 text-indigo-800">sentrychat-playground/</strong></div>
                        <div className="pl-4">├── 📁 <strong className="text-slate-700">src/</strong> — Primary source code folder</div>
                        <div className="pl-8">├── 📁 <strong className="text-slate-600">components/</strong> — UI assets & modals</div>
                        <div className="pl-8">├── 📄 <strong className="text-indigo-600">App.tsx</strong> — Tab views & routing</div>
                        <div className="pl-8">├── 📄 <strong className="text-indigo-600">data.ts</strong> — Training triggers dataset</div>
                        <div className="pl-8">├── 📄 <strong className="text-indigo-600">utils.ts</strong> — NLP algorithms (TF-IDF math)</div>
                        <div className="pl-8">└── 📄 <strong className="text-indigo-600">index.css</strong> — Tailwind direct imports</div>
                        <div className="pl-4">├── 📄 <strong className="text-emerald-700">package.json</strong> — Lib dependencies config</div>
                        <div className="pl-4">└── 📄 <strong className="text-slate-500">vite.config.ts</strong> — Vite development rules</div>
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            )}

          </div>

        </main>

        {/* RIGHT SIDEBAR - ACTIVE INTENT RULES CONFIG & ADD FORM */}
        <aside className="w-full lg:w-80 bg-white border-l border-slate-200 p-5 md:p-6 shrink-0 lg:overflow-y-auto hidden xl:flex flex-col gap-5">
          
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              Intents Editor
            </h3>
            <button
              onClick={() => setShowAddIntentModal(true)}
              className="text-[10px] font-mono font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer flex items-center gap-0.5"
            >
              + Create New <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {/* QUICK CHOOSE INTENT DROPDOWN */}
          <div>
            <label htmlFor="active-intent-select" className="text-[9px] font-mono font-bold text-slate-450 text-slate-500 uppercase block mb-1">
              Select Active Intent to Edit
            </label>
            <select
              id="active-intent-select"
              value={selectedIntentId}
              onChange={(e) => setSelectedIntentId(e.target.value)}
              className="w-full bg-slate-55 bg-slate-50 border border-slate-300 text-xs font-semibold rounded-lg p-2.5 text-slate-700 focus:outline-none focus:border-indigo-600 cursor-pointer"
            >
              {intents.map(i => (
                <option key={i.id} value={i.id}>
                  {i.name} ({i.phrases.length} phs)
                </option>
              ))}
            </select>
          </div>

          {/* SPECIFIC CONFIG ITEMS BLOCK */}
          <div className="space-y-4 bg-slate-50 p-4 border border-slate-205 rounded-2xl flex-1">
            <span className="text-[9px] font-mono font-bold text-slate-450 text-slate-500 uppercase block leading-none">
              Intent ID Payload: {currentSelectedIntent.id}
            </span>

            {/* Editing Box */}
            <div className="space-y-1.5">
              <label htmlFor="intent-title-input" className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block font-mono">
                Friendly Intent Title
              </label>
              <input
                id="intent-title-input"
                type="text"
                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-800 font-medium"
                value={currentSelectedIntent.name}
                onChange={(e) => {
                  const updatedName = e.target.value;
                  setIntents(prev => prev.map(i => i.id === selectedIntentId ? { ...i, name: updatedName } : i));
                }}
              />
            </div>

            {/* Editing response copy */}
            <div className="space-y-1.5">
              <label htmlFor="intent-response-textarea" className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block font-mono">
                Response Template Payload
              </label>
              <textarea
                id="intent-response-textarea"
                rows={4}
                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-850 leading-relaxed"
                value={currentSelectedIntent.response}
                onChange={(e) => {
                  const updatedResponse = e.target.value;
                  setIntents(prev => prev.map(i => i.id === selectedIntentId ? { ...i, response: updatedResponse } : i));
                }}
              />
            </div>

            {/* List phrases delete block */}
            <div className="space-y-2">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block font-mono">
                Sample Phrases Matrix
              </label>
              <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                {currentSelectedIntent.phrases.map((phrase, pi) => (
                  <div key={pi} className="flex justify-between items-center text-xs p-1.5 bg-white border border-slate-200 rounded-lg">
                    <span className="truncate max-w-[150px] font-mono text-[11px] text-slate-700">"{phrase}"</span>
                    <button
                      onClick={() => handleDeletePhrase(currentSelectedIntent.id, pi)}
                      className="text-slate-400 hover:text-rose-600 p-0.5 rounded cursor-pointer shrink-0"
                      aria-label="Delete phrase"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Color switcher */}
            <div className="space-y-1.5 pt-2 border-t border-slate-200">
              <label className="text-[9px] font-bold text-slate-400 uppercase block font-mono">
                Accent Theme color
              </label>
              <div className="flex gap-1.5">
                {['indigo', 'blue', 'amber', 'rose', 'purple', 'emerald'].map((c) => (
                  <button
                    key={c}
                    aria-label={`Set accent color ${c}`}
                    onClick={() => setIntents(prev => prev.map(i => i.id === selectedIntentId ? { ...i, color: c } : i))}
                    className={`w-5 h-5 rounded-full border transition-all cursor-pointer ${
                      currentSelectedIntent.color === c ? 'ring-2 ring-slate-800 scale-105' : 'opacity-85'
                    } ${
                      c === 'indigo' ? 'bg-indigo-500' :
                      c === 'blue' ? 'bg-blue-500' :
                      c === 'amber' ? 'bg-amber-500' :
                      c === 'rose' ? 'bg-rose-500' :
                      c === 'purple' ? 'bg-purple-500' : 'bg-emerald-500'
                    }`}
                  />
                ))}
              </div>
            </div>

          </div>

        </aside>

      </div>

      {/* CREATE INTENT DIALOG BACKDROP */}
      {showAddIntentModal && (
        <div className="fixed inset-y-0 inset-x-0 bg-slate-900/40 flex items-center justify-center p-4 z-50 backdrop-blur-3xs">
          
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden flex flex-col"
          >
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-sm font-bold uppercase text-slate-800 font-display flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-indigo-600" />
                Configure New Chatbot Intent
              </h2>
              <button
                onClick={() => setShowAddIntentModal(false)}
                className="text-slate-450 hover:text-slate-805 text-sm font-mono cursor-pointer"
              >
                ✕ Close
              </button>
            </div>

            <form onSubmit={handleCreateIntent} className="p-5 space-y-4">
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-mono font-bold uppercase text-slate-400 tracking-wider block mb-1">
                    Unique Intent ID (No spaces)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. store_hours"
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:border-indigo-600 font-mono"
                    value={newIntentId}
                    onChange={(e) => setNewIntentId(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-[9px] font-mono font-bold uppercase text-slate-400 tracking-wider block mb-1">
                    Friendly Active Title
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Business Hours"
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:border-indigo-600"
                    value={newIntentName}
                    onChange={(e) => setNewIntentName(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="new-intent-category" className="text-[9px] font-mono font-bold uppercase text-slate-400 tracking-wider block mb-1">
                    Intent Department Category
                  </label>
                  <select
                    id="new-intent-category"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:outline-none cursor-pointer"
                    value={newIntentCategory}
                    onChange={(e) => setNewIntentCategory(e.target.value)}
                  >
                    <option value="General">General</option>
                    <option value="Billing">Billing / Pricing</option>
                    <option value="Operations">Operations / Logistics</option>
                    <option value="Technical">Technical Support</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="new-intent-color" className="text-[9px] font-mono font-bold uppercase text-slate-400 tracking-wider block mb-1">
                    Theme Color Indicator
                  </label>
                  <select
                    id="new-intent-color"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:outline-none cursor-pointer"
                    value={newIntentColor}
                    onChange={(e) => setNewIntentColor(e.target.value)}
                  >
                    <option value="indigo">Indigo Accent</option>
                    <option value="blue">Blue Accent</option>
                    <option value="amber">Amber Accent</option>
                    <option value="rose">Rose Accent</option>
                    <option value="purple">Purple Accent</option>
                    <option value="emerald">Emerald Accent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[9px] font-mono font-bold uppercase text-slate-400 tracking-wider block mb-1">
                  Phrases Triggers (One per line)
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g.&#10;when are you open&#10;business hours operation&#10;closing schedules"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:border-indigo-600 font-mono"
                  value={newIntentPhrases}
                  onChange={(e) => setNewIntentPhrases(e.target.value)}
                />
              </div>

              <div>
                <label className="text-[9px] font-mono font-bold uppercase text-slate-400 tracking-wider block mb-1">
                  Chatbot Reply Copy Output
                </label>
                <textarea
                  rows={3}
                  placeholder="Type what the support message should answer..."
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:border-indigo-600 leading-normal"
                  value={newIntentResponse}
                  onChange={(e) => setNewIntentResponse(e.target.value)}
                />
              </div>

              {formError && (
                <div className="bg-rose-50 border border-rose-150 p-2.5 rounded-lg text-rose-700 text-2xs font-mono">
                  {formError}
                </div>
              )}

              <div className="flex gap-2 justify-end pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddIntentModal(false)}
                  className="px-4 py-2 text-slate-500 hover:text-slate-800 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg py-2 px-5 text-xs font-semibold shadow-xs cursor-pointer transition-transform hover:scale-[1.01]"
                >
                  Save Intent Rule
                </button>
              </div>

            </form>
          </motion.div>

        </div>
      )}

    </div>
  );
}

// Minimal auxiliary Close icon inside custom phrase tags
function XIcon({ className }: { className?: string }) {
  return (
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
      className={className}
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}
