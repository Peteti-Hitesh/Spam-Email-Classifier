export interface Intent {
  id: string;
  name: string;
  category: string;
  phrases: string[];
  response: string;
  actionType: 'none' | 'link' | 'agent';
  actionPayload?: string;
  color: string;
}

// Predefined set of base intents representing a premium customer support flow
export const DEFAULT_INTENTS: Intent[] = [
  {
    id: 'greeting',
    name: 'Greetings & Salutations',
    category: 'General',
    phrases: [
      'hello',
      'hi',
      'hey there',
      'good morning',
      'is anyone online',
      'good afternoon',
      'whats up'
    ],
    response: 'Hello! Welcome to SentryML Customer Support. I am your automated NLP agent. You can ask me about subscription pricing, ordering/shipping details, our refund policy, or common account credentials. How can I help you today?',
    actionType: 'none',
    color: 'indigo'
  },
  {
    id: 'pricing',
    name: 'SaaS Subscription Pricing',
    category: 'Billing',
    phrases: [
      'how much does it cost',
      'what are the plans',
      'pricing details',
      'subscription pricing cost',
      'is there a free trial',
      'how much is monthly package',
      'what is checkout pricing'
    ],
    response: 'Our pricing starts at $15/month for the Starter plan, and $49/month for the Pro plan. We offer a full 14-day free trial on all tier packages with no credit card required upfront. Visit our pricing module to see a feature comparison matrix!',
    actionType: 'link',
    actionPayload: 'https://example.com/pricing',
    color: 'blue'
  },
  {
    id: 'shipping',
    name: 'Shipping & Delivery Status',
    category: 'Operations',
    phrases: [
      'where is my package',
      'shipping delivery timing',
      'how long till shipping arrives',
      'track my order status',
      'express shipping cost options',
      'status of delivery'
    ],
    response: 'Standard cargo shipping takes 3-5 business days, while Express delivers door-to-door in 1-2 days. Once shipped, you will receive an email containing a parcel lookup tracking ID code to monitor shipment securely.',
    actionType: 'none',
    color: 'amber'
  },
  {
    id: 'refunds',
    name: 'Returns & Refund Guarantee',
    category: 'Billing',
    phrases: [
      'how to get a refund',
      'refund policy cancel order',
      'i want my money back refund',
      'can i return my order',
      'refund application process'
    ],
    response: 'We back all platform subscriptions with a 100% money-back guarantee within 30 days of purchase. Just go to Account Settings > Billing to trigger an automated cancel refund, or ask me to loop in a human specialist.',
    actionType: 'none',
    color: 'rose'
  },
  {
    id: 'tech_support',
    name: 'Login & Password Credentials',
    category: 'Technical',
    phrases: [
      'i cannot sign in account',
      'password reset instructions',
      'app crashing login error',
      'how to unlock profile access',
      'resetting credentials'
    ],
    response: 'If you are having troubles logging in, click the "Forgot Password" link on the sign-in hub to reset credentials via secure email. If the system fails or crashes, verify that browser cookies are active.',
    actionType: 'none',
    color: 'purple'
  },
  {
    id: 'agent_escalation',
    name: 'Speak to a human',
    category: 'Technical',
    phrases: [
      'transfer me to a real person',
      'speak with support manager',
      'human customer agent representative',
      'talk to customer service representative',
      'real employee call dial'
    ],
    response: 'Searching database... I am transferring this workspace chat feed to an active customer care specialist. Please stand by, a human teammate will reply here within 60 seconds!',
    actionType: 'agent',
    color: 'emerald'
  },
  {
    id: 'vscode_shortcuts',
    name: 'VS Code Commands & Shortcuts',
    category: 'Technical',
    phrases: [
      'vs code commands',
      'vscode terminal shortcut',
      'keyboard shortcuts vs code',
      'open command palette',
      'vscode extensions keyboard'
    ],
    response: 'Essential VS Code hotkeys:\n\n• Command Palette: Ctrl+Shift+P (Cmd+Shift+P on macOS)\n• Integrated Terminal toggle: Ctrl+` (backtick)\n• Quick Open File finder: Ctrl+P (Cmd+P on macOS)\n• Format Code Document auto: Shift+Alt+F (Shift+Option+F on macOS)\n• Multi-cursor edit mode: Alt+Click (Option+Click on macOS)\n\nWe recommend installing the "ESLint", "Prettier", and "Tailwind CSS IntelliSense" extensions inside VS Code for real-time coding assistants!',
    actionType: 'none',
    color: 'blue'
  },
  {
    id: 'vscode_running_local',
    name: 'Running project in VS Code',
    category: 'Technical',
    phrases: [
      'how to run in vscode',
      'run software locally terminal',
      'install npm dependencies command',
      'start dev server vscode commands',
      'npm run dev'
    ],
    response: 'To run this Customer Support Chatbot project locally on your machine in VS Code:\n\n1. Download/export the ZIP source code or link your Git repository.\n2. Open the project root folder directly inside VS Code.\n3. Open your integrated terminal (Ctrl+`) and run:\n   npm install\n4. Once complete, boot up the local dev compiler server via:\n   npm run dev\n5. Open your browser to http://localhost:3000 to test and tinker with your local NLP algorithms!',
    actionType: 'none',
    color: 'indigo'
  },
  {
    id: 'goodbye',
    name: 'Farewell & Exit',
    category: 'General',
    phrases: [
      'goodbye thanks for help',
      'bye then',
      'see you later',
      'exit conversation stop chat',
      'that is all thank you'
    ],
    response: 'Thank you for consulting SentryML Support. I hope this interactive NLP dashboard was educational! Have a wonderful day!',
    actionType: 'none',
    color: 'slate'
  }
];

// Simple customer service queries for testing
export const SUGGESTED_QUERIES = [
  'How much is the subscription?',
  'Where is my tracking code?',
  'How can I reset my password?',
  'What are some VS Code commands?',
  'How do I run this app in VS Code locally?'
];

// Stopwords list for cleaning NLP term lists
export const STOPWORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any',
  'are', 'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between',
  'both', 'but', 'by', 'can', 'did', 'do', 'does', 'doing', 'down', 'during', 'each',
  'few', 'for', 'from', 'further', 'had', 'has', 'have', 'having', 'he', "he'd", "he'll",
  "he's", 'her', 'here', "here's", 'hers', 'herself', 'him', 'himself', 'his', 'how',
  "how's", 'i', "i'd", "i'll", "i'm", "i've", 'if', 'in', 'into', 'is', 'it', "it's",
  'its', 'itself', 'me', 'more', 'most', 'my', 'myself', 'no', 'nor', 'not', 'of', 'off',
  'on', 'once', 'only', 'or', 'other', 'ought', 'our', 'ours', 'ourselves', 'out', 'over',
  'own', 'same', 'she', "she'd", "she'll", "she's", 'should', 'so', 'some', 'such', 'than',
  'that', "that's", 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there',
  "there's", 'these', 'they', "they'd", "they'll", "they're", "they've", 'this', 'those',
  'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was', 'we', "we'd", "we'll",
  "we're", "we've", 'were', 'what', "what's", 'when', "when's", 'where', "where's",
  'which', 'while', 'who', "who's", 'whom', 'why', "why's", 'with', 'would', 'you',
  "you'd", "you'll", "you're", "you've", 'your', 'yours', 'yourself', 'yourselves'
]);
