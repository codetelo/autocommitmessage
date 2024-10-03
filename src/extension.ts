import * as vscode from "vscode";
import OpenAI from "openai";

// This method is called when your extension is activated
export function activate(context: vscode.ExtensionContext) {
  let generatedMessage = ""; // Placeholder for the AI-generated commit message

  // Register a command for generating a commit message
  const disposable = vscode.commands.registerCommand(
    "autocommitmessage.generateCommitMessage",
    async () => {
      // Access the Git extension API
      const gitExtension =
        vscode.extensions.getExtension("vscode.git")?.exports;
      if (!gitExtension) {
        vscode.window.showErrorMessage("Git extension not found!");
        return;
      }

      const api = gitExtension.getAPI(1);
      const repo = api.repositories[0]; // Access the first repository in the workspace

      if (!repo) {
        vscode.window.showErrorMessage("No Git repository found!");
        return;
      }

      // Get the git diff for the working tree
      const diffs = await repo.diff();

      // Generate the commit message from the AI
      generatedMessage = await generateCommitMessageFromAI(diffs); // AI function (to be implemented)

      // Show the generated commit message in the status bar
      updateStatusBarItem(generatedMessage, repo);
    }
  );

  context.subscriptions.push(disposable);
}

// Update the status bar item with the generated commit message and allow editing
function updateStatusBarItem(message: string, repo: any) {
  const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );
  statusBarItem.text = `$(git-commit) Commit Message: ${message}`;
  statusBarItem.tooltip = "Click to edit the commit message";
  statusBarItem.command = "autocommitmessage.editCommitMessage"; // Command to edit message
  statusBarItem.show();

  // Ensure the command gets disposed of when the extension is deactivated
  vscode.commands.getCommands().then((commands) => {
    if (!commands.includes("autocommitmessage.editCommitMessage")) {
      // Register the command with the actual function, not the Disposable
      vscode.commands.registerCommand(
        "autocommitmessage.editCommitMessage",
        async () => {
          // Show an input box pre-filled with the generated commit message
          const newMessage = await vscode.window.showInputBox({
            prompt: "Edit Commit Message",
            value: message, // Show the generated message
          });

          if (newMessage) {
            // Update the status bar with the new message
            statusBarItem.text = `$(git-commit) Commit Message: ${newMessage}`;
            message = newMessage; // Update the internal message

            // Ask if the user wants to commit the changes
            const shouldCommit = await vscode.window.showQuickPick(
              ["Yes", "No"],
              {
                placeHolder:
                  "Do you want to commit the changes with this message?",
              }
            );

            if (shouldCommit === "Yes") {
              // Perform the git commit with the updated message
              await repo.commit(newMessage);
              vscode.window.showInformationMessage("Commit message applied!");
            }
          }
        }
      );
    }
  });
}

// Example placeholder for AI integration (replace with actual implementation)
async function generateCommitMessageFromAI(diffs: string): Promise<string> {
  const client = new OpenAI();

  const prompt = `Write a concise git commit message for the following code changes:\n${diffs}`;
  const response = await client.chat.completions.create({
    model: "text-davinci-003",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 100,
  });

  if (
    !response.choices ||
    response.choices.length === 0 ||
    !response.choices[0].message.content
  ) {
    throw new Error("Failed to generate commit message");
  }

  return response.choices[0].message.content;
}

// This method is called when your extension is deactivated
export function deactivate() {}
