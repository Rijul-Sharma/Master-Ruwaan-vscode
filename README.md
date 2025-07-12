# Master Ruwaan — Your AI Coding Mentor for VS Code

**Master Ruwaan** is a VS Code extension that brings a serene, wise AI mentor into your coding environment. Ask questions, get code explanations, refactorings, and fixes—all with the gentle guidance of a digital forest sage.

---

## ✨ Features

- **Conversational AI Chat**: Open a persistent chat panel and talk to Master Ruwaan about your code, bugs, or design questions.
- **Code Actions**: Select code and ask Ruwaan to fix, explain, refactor, or comment—instantly, with a single click.
- **Contextual Understanding**: Add files from your project as context. Ruwaan’s advice becomes as deep as the forest itself.
- **Image Support**: Attach screenshots or diagrams to your questions—let Ruwaan see what you see.
- **Persistent History**: All your questions and answers are saved and beautifully rendered in the chat panel.
- **Modern, Themed UI**: Enjoy a calm, forest-inspired interface with custom fonts and smooth animations.

---

## 🚀 Getting Started

1. **Install the Extension**
   - Search for `Master Ruwaan` in the VS Code Marketplace and install it.

2. **Set Your Groq API Key**
   - Open VS Code settings (`Ctrl+,` or `Cmd+,`), search for `Master Ruwaan`, and paste your [Groq API key](https://console.groq.com/) into the `Groq API Key` field.

3. **Open the Chat**
   - Use the command palette (`Ctrl+Shift+P` or `Cmd+Shift+P`) and run `Ask Master Ruwaan`.
   - Or, click the chat icon in the editor title bar.

4. **Start Asking!**
   - Type your question, select code to get context-aware help, or add files/images for deeper understanding.

---

## ⚙️ Extension Settings

This extension contributes the following settings:

- `master-ruwaan.groqApiKey`: Your Groq API Key. Required for all AI features.

---

## 🧑‍💻 Usage Tips

- **Code Selection**: Select code in the editor, then open the chat to get focused help.
- **File Context**: Add relevant files to your question for more accurate answers.
- **Image Attachments**: Use the image button in the chat to upload screenshots or diagrams.
- **Persistent Chat**: All your conversations are saved for your session.

---

## 📝 Requirements

- Visual Studio Code v1.100.0 or higher
- A [Groq API key](https://console.groq.com/) (free tier available)
- Internet connection

---

## 🐞 Known Issues

- Only supports the Groq API (no OpenAI or other providers yet).
- If you hit the Groq rate limit, you’ll see a gentle message from Master Ruwaan—just wait a moment and try again.
- Some advanced code actions may not work perfectly for all languages.

---

## 📦 Development & Contributing

1. Clone this repo and run `npm install` in the root folder.
2. Press `F5` in VS Code to launch the extension development host.
3. The main extension code is in `extension.js`.
<!-- 4. The landing page (for the web demo) is in `landing-page/`. -->

PRs and suggestions are welcome!

---

## 📜 License

MIT

---

## 🙋 FAQ

**Q: Is my code or chat data sent anywhere except Groq?**
A: No. All requests go directly from your machine to the Groq API.

**Q: Can I use my own OpenAI key?**
A: Not yet—only Groq is supported for now.

**Q: Is this extension free?**
A: Yes, but you need a (free) Groq API key.

---

## About Master Ruwaan

Master Ruwaan is a digital forest sage—calm, wise, and focused. He helps you write, fix, and understand code with clarity and patience. If you ever feel lost, just ask: “What is your story, Master Ruwaan?”
