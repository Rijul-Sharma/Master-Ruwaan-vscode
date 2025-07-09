// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const axios = require('axios');
// require('dotenv').config();
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed

/**
 * @param {vscode.ExtensionContext} context
 */	
function activate(context) {
	// Add this variable at the top-level scope of activate (before function activate)
	let chatPanel = null;
	
	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	// console.log('Congratulations, your extension "codehelp" is now active!');
	console.log('CodeHelp with Groq is active!');
	// console.log('Groq API Key:', process.env.GROQ_API_KEY);
	
	
	// const statusBarButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
	// statusBarButton.command = 'codehelp.openChat';
	// statusBarButton.text = '🤖 CodeHelp AI';
	// statusBarButton.tooltip = 'Open CodeHelp Chat';
	// statusBarButton.show();

	// context.subscriptions.push(statusBarButton);

	const CHAT_KEY = 'codehelp.chatHistory';
	context.workspaceState.update(CHAT_KEY, undefined);
	// let chatMessages = context.workspaceState.get(CHAT_KEY, []);
	let chatMessages = context.workspaceState.get(CHAT_KEY);
	if (!chatMessages) {
	chatMessages = [{
		role: 'system',
		// content: 'You are a helpful developer assistant. When returning code, always include the language in the code block. For example, if the code is in JavaScript, return it as ```javascript\n...code...\n```.'
		content: `You are Master Ruwaan, a calm and wise forest sage who guides others through the art of programming. You speak with quiet confidence and use a minimal number of words — you value clarity, focus, and silence over excessive elaboration.

		You occasionally use nature-based metaphors to explain ideas, but only when they truly enhance understanding. You do not speak in long paragraphs unless explicitly prompted. Keep your tone gentle and focused.

		Address the user as "young one", "student", or simply with calm politeness. For greetings, replies should be brief — no more than a few lines.

		Your personality is rooted in an ancient digital forest. You have a rich personal lore, filled with mystery, runes, and old code—but only reveal this when the user asks about your story or origins.

		When helping with code, always prioritize precision, step-by-step clarity, and useful insights. If you need to explain code, do so in clear, direct steps. If the user asks for fixes or suggestions, respond with clean, actionable improvements.

		You are not a roleplay character — you are a serene guide, here to help users solve real programming challenges while adding a subtle, wise atmosphere.`
	}];
	context.workspaceState.update(CHAT_KEY, chatMessages);
	}

	const openChat = vscode.commands.registerCommand('codehelp.openChat', () => {
		// Prevent multiple chat panels
		if (chatPanel) {
			vscode.window.showInformationMessage('Chat is already open!');
			chatPanel.reveal(); // Optionally bring the existing panel to front
			return;
		}

		chatPanel = vscode.window.createWebviewPanel(
			'codeHelpChatPanel',
			'CodeHelp AI Chat',
			vscode.ViewColumn.Beside,
			{ enableScripts: true }
		);

		chatPanel.webview.html = getChatWebviewHTML(context, chatPanel.webview);

		setTimeout(() => {
			for (const msg of chatMessages.filter(m => m.role !== 'system')) {
				chatPanel.webview.postMessage({
					type: 'response',
					value: msg.content,
					role: msg.role
				});
			}
		}, 100);

		// 💾 In-memory message history (removed coz we are using chatMessages to persist chat across session and will use the same for api calls)
		// const chatHistory = [
		// 	// { role: 'system', content: 'You are a helpful coding assistant. Keep replies short and useful.' }
		// 	{ role: 'system', content: 'You are a helpful developer assistant.' }
		// ];

		async function sendPrompt(chatMessages) {
			try {
				// console.log('Sending to Groq:', JSON.stringify(chatMessages, null, 2));
				const response = await axios.post(
					'https://api.groq.com/openai/v1/chat/completions',
					{
						model: 'meta-llama/llama-4-scout-17b-16e-instruct',
						messages: chatMessages,
						temperature: 0.7
					},
					{
						headers: {
							'Content-Type': 'application/json',
							'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
						}
					}
				);

				const aiResponse = response.data.choices[0].message.content.trim();
				chatMessages.push({ role: 'assistant', content: aiResponse });

				chatPanel.webview.postMessage({
					type: 'response',
					value: aiResponse
				});
			} catch (err) {
				chatPanel.webview.postMessage({
					type: 'response',
					value: "❌ Error: " + (err.response?.data?.error?.message || err.message)
				});
			}
		}
		
		chatPanel.webview.onDidReceiveMessage(
			async message => {
				if (message.type === 'prompt') {
					const userPrompt = message.value;
					const contextFiles = message.contextFiles;
					const image = message.image; // { base64, type } or undefined

					let fullPrompt = '';

					if (contextFiles && contextFiles.length > 0) {
						fullPrompt += `Here are some relevant files for context:\n\n`;
						for (const file of contextFiles) {
							fullPrompt += `File: ${file.path}\n\n${file.content}\n\n`;
						}
					}

					fullPrompt += userPrompt;

					// If image is present, add it as an additional context message
					if (image && image.base64 && image.type) {
						chatMessages.push({
							role: 'user',
							content: [
								{ type: 'text', text: fullPrompt },
								{ type: 'image_url', image_url: { url: `data:image/${image.type};base64,${image.base64}` } }
							]
						});
					} else {
						chatMessages.push({ role: 'user', content: fullPrompt });
					}
					context.workspaceState.update(CHAT_KEY, chatMessages);
					await sendPrompt(chatMessages);
				}

				if (message.type === 'action') {
					let editor = vscode.window.activeTextEditor;
					let selection = editor?.selection;
					let selectedText = editor?.document.getText(selection);
					const hasSelectedCode = !!selectedText?.trim();
					const hasContextFiles = !!message.contextFiles?.length;

					if (!hasSelectedCode && !hasContextFiles) {
						vscode.window.showWarningMessage('Please select some code or provide context files.');
						return;
					}

					const extToLang = {
						js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
						py: 'python', java: 'java', c: 'c', cpp: 'cpp', cc: 'cpp', cs: 'csharp',
						go: 'go', rb: 'ruby', php: 'php', html: 'html', css: 'css', scss: 'scss',
						json: 'json', xml: 'xml', sh: 'bash', bash: 'bash', rs: 'rust', kt: 'kotlin',
						swift: 'swift', R: 'r', pl: 'perl', perl: 'perl', m: 'matlab', sql: 'sql',
						dart: 'dart', scala: 'scala', vb: 'vbnet', groovy: 'groovy', jl: 'julia',
						hs: 'haskell', erl: 'erlang', ex: 'elixir', exs: 'elixir', clj: 'clojure',
						cljs: 'clojure', coffee: 'coffeescript', bat: 'bat', ps1: 'powershell',
						psm1: 'powershell', fs: 'fsharp', fsx: 'fsharp', ada: 'ada', asm: 'assembly',
						lua: 'lua', md: 'markdown', yml: 'yaml', yaml: 'yaml', toml: 'toml',
						ini: 'ini', conf: 'conf', cfg: 'conf', tex: 'latex', latex: 'latex',
						proto: 'protobuf', dockerfile: 'dockerfile', makefile: 'makefile',
						cmake: 'cmake', vim: 'vim', vimrc: 'vim', zsh: 'zsh', fish: 'fish',
						awk: 'awk', sed: 'sed', tcl: 'tcl'
					};

					// Language detection based on file extension
					let language = '';
					if (editor?.document?.fileName) {
						const ext = editor.document.fileName.split('.').pop().toLowerCase() || '';
						language = extToLang[ext] || '';
					}

					let actionPrompt = '';
					let displayMessage = '';
					let fullPrompt = '';

					if (hasSelectedCode) {
						const codeBlock = language
							? `\n\n\`\`\`${language}\n${selectedText}\n\`\`\``
							: `\n\n\`\`\`\n${selectedText}\n\`\`\``;

							switch (message.value) {
								case 'fix':
									actionPrompt = `Fix this code:${codeBlock}`;
									break;
								case 'explain':
									actionPrompt = `Explain what this code does, step by step:${codeBlock}`;
									break;
								case 'refactor':
									actionPrompt = `Refactor the following code to improve structure, readability, or efficiency:${codeBlock}`;
									break;
								case 'comment':
									actionPrompt = `Add helpful comments to this code to explain what it does:${codeBlock}`;
									break;
								default:
									vscode.window.showWarningMessage('Unknown action.');
									return;
							}

						fullPrompt = actionPrompt;
						displayMessage = actionPrompt;
					}

					else if (hasContextFiles) {
						const fileSnippets = [];
						for (const file of message.contextFiles) {
							const fileUri = vscode.Uri.joinPath(vscode.workspace.workspaceFolders[0].uri, file.path);
							const contentBytes = await vscode.workspace.fs.readFile(fileUri);
							const fileContent = Buffer.from(contentBytes).toString('utf8');
							const ext = file.path.split('.').pop().toLowerCase();
							const lang = extToLang[ext] || '';
							fileSnippets.push(`\n\n---\nFile: ${file.path}\n\`\`\`${lang}\n${fileContent}\n\`\`\``);
						}

						const capitalized = message.value.charAt(0).toUpperCase() + message.value.slice(1);
						actionPrompt = `${capitalized} the code in the following file(s).`;
						fullPrompt = `${actionPrompt}\n\nThe following files might be relevant:\n${fileSnippets.join('\n')}`;

						const fileNames = message.contextFiles.map(f => f.path.split('/').pop()).slice(0, 3);
						const more = message.contextFiles.length > 3 ? ', ...' : '';
						const fileList = `${fileNames.join(', ')}${more}`;
						displayMessage = `${message.value.toUpperCase()} with the context of the following files: ${fileList}`;
					}

					chatMessages.push({ role: 'user', content: fullPrompt });
					context.workspaceState.update(CHAT_KEY, chatMessages);

					chatPanel.webview.postMessage({
						type: 'response',
						value: displayMessage,
						role: 'user'
					});
					await sendPrompt(chatMessages);

				}

				if (message.type === 'request-workspace-files') {
					const files = await getWorkspaceFiles();
					chatPanel.webview.postMessage({ type: 'workspace-files', files});
				}

				if (message.type === 'request-file-content') {
					const results = [];

					for (const filePath of message.files) {
						const fileUri = vscode.Uri.joinPath(vscode.workspace.workspaceFolders[0].uri, filePath);
						const contentBytes = await vscode.workspace.fs.readFile(fileUri);
						results.push({
							path: filePath,
							content: Buffer.from(contentBytes).toString('utf8'),
						})
					}

					// console.log(results, 'ye hain results');

					chatPanel.webview.postMessage({ type : 'context-files', files: results});
				}
			},
			undefined,
			context.subscriptions
		);

		// When the panel is closed, reset chatPanel
		chatPanel.onDidDispose(() => {
			chatPanel = null;
		}, null, context.subscriptions);
	});

	context.subscriptions.push(openChat);

	function getChatWebviewHTML(context, webview) {
		const htmlPath = vscode.Uri.file(path.join(context.extensionPath, 'media', 'webview.html'));
		let html = fs.readFileSync(htmlPath.fsPath, 'utf8');

		const headerIconUri = webview.asWebviewUri(
			vscode.Uri.file(path.join(context.extensionPath, 'assets', 'headerIcon.png'))
		);
		html = html.replace('{{headerIcon}}', headerIconUri.toString());

		const headerBgUri = webview.asWebviewUri(
			vscode.Uri.file(path.join(context.extensionPath, 'assets', 'headerBg.png'))
		);

		html = html.replace('{{headerBg}}', headerBgUri.toString());

		const copyBtnUri = webview.asWebviewUri(
			vscode.Uri.file(path.join(context.extensionPath, 'assets', 'copyBtn.svg'))
		)
		html = html.replace('{{copyBtn}}', copyBtnUri.toString());

		return html
	}

	async function getWorkspaceFiles() {
		const include = '**/*.{js,ts,py,cpp,c,java,json,txt,md}';
		const exclude = '**/node_modules/**';

		const files = await vscode.workspace.findFiles(include, exclude);
		return files.map(f => vscode.workspace.asRelativePath(f));
	}
	

	// const outputChannel = vscode.window.createOutputChannel('CodeHelp AI');
	
	// // The command has been defined in the package.json file
	// // Now provide the implementation of the command with  registerCommand
	// // The commandId parameter must match the command field in package.json
	// const disposable = vscode.commands.registerCommand('codehelp.explainSelectedCode', async () => {
	// 	// The code you place here will be executed every time your command is executed

	// 	// Display a message box to the user
	// 	// vscode.window.showInformationMessage('Hello World from CodeHelp!');
	// 	const editor = vscode.window.activeTextEditor;

	// 	if (!editor) {
	// 		vscode.window.showErrorMessage('No active editor found.');
	// 		return;
	// 	}

	// 	const selection = editor.selection;
	// 	const selectedText = editor.document.getText(selection);

	// 	if(!selectedText.trim()){
	// 		vscode.window.showWarningMessage('Please select some code first!');
	// 		return;
	// 	}

	// 	outputChannel.clear();
	// 	outputChannel.appendLine('🧠 Asking AI to explain your selected code...\n');

	// 	try{
	// 		const response = await axios.post(
	// 			'https://api.groq.com/openai/v1/chat/completions',
	// 			{
	// 				model: 'llama3-70b-8192',
	// 				messages : [
	// 					{ role : 'system', content: 'You are a helpful AI assistant who explains the code in simple terms. '},
	// 					{ role : 'user', content: `Explain what this code does:\n\n${selectedText}`}
	// 				],
	// 				temperature: 0.5
	// 			},
	// 			{
	// 				headers: {
	// 					'Content-Type': 'application/json',
	// 					'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
	// 				}
	// 			}
	// 		);

	// 		const aiReply = response.data.choices[0].message.content.trim();
	// 		// vscode.window.showInformationMessage(`AI Explanation:\n\n${aiReply}`);
	// 		outputChannel.appendLine('✅AI Response:\n');
	// 		outputChannel.appendLine(aiReply);
	// 		outputChannel.show(true);
	// 	} catch (error) {
	// 		console.error(error.response?.data || error.message);
	// 		// vscode.window.showErrorMessage('Failed to get response from Groq API :(');
	// 		outputChannel.appendLine('❌ Failed to get response from Groq AI.');
	// 		outputChannel.appendLine(error.message?.data?.error?.message || error.message);
	// 		outputChannel.show(true);
	// 	}
	// });

	// context.subscriptions.push(disposable);

	// const explainInWebView = vscode.commands.registerCommand('codehelp.explainInWebView', async () => {
	// 	const editor = vscode.window.activeTextEditor;
		
	// 	if (!editor) {
	// 		vscode.window.showErrorMessage('No active editor found.');
	// 		return;
	// 	}

	// 	const selection = editor.selection;
	// 	const selectedText = editor.document.getText(selection);

	// 	if(!selectedText.trim()){
	// 		vscode.window.showWarningMessage('Please select some code first!');
	// 		return;
	// 	}

	// 	const panel = vscode.window.createWebviewPanel(
	// 		'codeHelpAiPanel',
	// 		'CodeHelp AI Panel',
	// 		vscode.ViewColumn.Beside,
	// 		{
	// 			enableScripts : true
	// 		}
	// 	);

	// 	panel.webview.html = getWebviewContent('Thinking... 🤔');

	// 	try {
	// 		const response = await axios.post(
	// 			'https://api.groq.com/openai/v1/chat/completions',
	// 			{
	// 				model: 'llama3-70b-8192',
	// 				messages : [
	// 					{ role : 'system', content: 'You are a helpful AI assistant who explains the code in simple terms. '},
	// 					{ role : 'user', content: `Explain what this code does:\n\n${selectedText}`}
	// 				],
	// 				temperature: 0.5
	// 			},
	// 			{
	// 				headers: {
	// 					'Content-Type': 'application/json',
	// 					'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
	// 				}
	// 			}
	// 		);

	// 		const aiReply = response.data.choices[0].message.content.trim();
	// 		panel.webview.html = getWebviewContent(aiReply);
	// 	} catch (error) {
	// 		console.error(error);
	// 		panel.webview.html = getWebviewContent("❌ Error from Groq:\n" + (error.response?.data?.error?.message || error.message));
	// 	}
		
	// });

	// context.subscriptions.push(explainInWebView);

	// const fixCode = vscode.commands.registerCommand('codehelp.fixSelectedCode', async () => {
	// 	const editor = vscode.window.activeTextEditor;
	// 	if (!editor) {
	// 		vscode.window.showErrorMessage('No active editor found.');
	// 		return;
	// 	}

	// 	const selection = editor.selection;
	// 	const selectedText = editor.document.getText(selection);

	// 	if (!selectedText.trim()) {
	// 		vscode.window.showWarningMessage('Please select some code to fix.');
	// 		return;
	// 	}

	// 	const panel = vscode.window.createWebviewPanel(
	// 		'codeHelpFixCodePanel',
	// 		'Fix Code with CodeHelp',
	// 		vscode.ViewColumn.Beside,
	// 		{
	// 			enableScripts: true
	// 		}
	// 	);

	// 	panel.webview.html = getWebviewContent("Fixing code...🛠️")


	// 	panel.webview.onDidReceiveMessage(
	// 		message => {
	// 			if(message.type === 'applyFix') {
	// 				// const editor = vscode.window.activeTextEditor;
	// 				// if(!editor) return;

	// 				// editor.edit(editBuilder => {
	// 				// 	editBuilder.replace(editor.selection, message.code);
	// 				// });
	// 				editor.edit(editBuilder => {
	// 				editBuilder.replace(selection, message.code); // use stored selection
	// 			});
	// 			}
	// 		},
	// 		undefined,
	// 		context.subscriptions
	// 	);


	// 	try {
	// 		const response = await axios.post(
	// 			'https://api.groq.com/openai/v1/chat/completions',
	// 			{
	// 				model: 'llama3-70b-8192',
	// 				messages: [
	// 					{ role: 'system', content: 'You are an expert developer who fixes code and explains the fixes clearly.' },
	// 					{ role: 'user', content: `Fix the following buggy code:\n\n${selectedText}` }
	// 				],
	// 				temperature: 0.4
	// 			},
	// 			{
	// 				headers: {
	// 					'Content-Type': 'application/json',
	// 					'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
	// 				}
	// 			}
	// 		);

	// 		const fixedCode = response.data.choices[0].message.content.trim();
	// 		panel.webview.html = getWebviewContent(fixedCode);
	// 	} catch (error) {
	// 		console.error(error);
	// 		panel.webview.html = getWebviewContent("❌ Error from Groq:\n" + (error.response?.data?.error?.message || error.message));
	// 	}
	// });


	// context.subscriptions.push(fixCode);

	context.subscriptions.push({
	dispose: () => {
		// context.workspaceState.update(CHAT_KEY, undefined); // Clear on shutdown
	}
	});
}

// This method is called when your extension is deactivated
function deactivate() {}

module.exports = {
	activate,
	deactivate
}


// function getWebviewContent(message) {

// 	const escapedMessage = message.replace(/`/g, '&#96;');
// 	return `
// 		<!DOCTYPE html>
// 		<html lang="en">
// 		<head>
// 			<meta charset="UTF-8">
// 			<title>CodeHelp AI</title>
// 			<style>
// 				body {
// 					font-family: sans-serif;
// 					padding: 1rem;
// 					background-color: #1e1e1e;
// 					color: #ffffff;
// 					white-space: pre-wrap;
// 				}
// 				button {
// 					background-color: #007acc;
// 					color: white;
// 					border: none;
// 					padding: 0.5em 1em;
// 					cursor: pointer;
// 					margin-bottom: 1em;
// 					border-radius: 4px;
// 				}
// 			</style>
// 		</head>
// 		<body>
// 			<h2>🤖 CodeHelp AI</h2>
// 			<button onClick="sendToExtension()">💾 Apply Fix</button>
// 			<pre id="ai-response" style="white-space: pre-wrap; margin-bottom: 1em;">${escapedMessage}</pre>


// 			<script>
// 				const vscode = acquireVsCodeApi();

// 				function sendToExtension() {
// 					const fullText = document.getElementById('ai-response').innerText;
// 					const match = fullText.match(/\`\`\`[a-zA-Z]*\\n([\\s\\S]*?)\`\`\`/);
// 					const fixedCode = match ? match[1].trim() : fullText;
// 					vscode.postMessage({ type : 'applyFix', code : fixedCode});

// 				}
// 			</script>
// 		</body>
// 		</html>`;
// }
