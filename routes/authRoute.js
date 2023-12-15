import { authenticate } from "@google-cloud/local-auth";
import { google } from "googleapis";
import {
  createLabel,
  getUnrepliedMessages,
} from "../controllers/gmailController.js";
import path from "path";
import { fileURLToPath } from "url"; 


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const authFunction = async (req, res) => {
  try {
    const auth = await authenticate({
      keyfilePath: path.join(__dirname, "auth.json"),
      scopes: [
        "https://www.googleapis.com/auth/gmail.readonly",
        "https://www.googleapis.com/auth/gmail.send",
        "https://www.googleapis.com/auth/gmail.labels",
        "https://mail.google.com/",
      ],
    });

    const labelName = "GmailAutoReplyBot";
    const gmail = google.gmail({ version: "v1", auth });
    const labelId = await createLabel(gmail, labelName);

    setInterval(async () => {
      const messages = await getUnrepliedMessages(gmail);
      if (messages && messages.length > 0) {
        for (const message of messages) {
          const messageData = await gmail.users.messages.get({
            auth,
            userId: "me",
            id: message.id,
          });

          const email = messageData.data;
          const hasReplied = email.payload.headers.some(
            (header) => header.name === "In-Reply-To"
          );

          if (!hasReplied) {
            const replyMessage = {
              userId: "me",
              resource: {
                raw: Buffer.from(
                  `To: ${
                    email.payload.headers.find(
                      (header) => header.name === "From"
                    ).value
                  }\r\n` +
                    `Subject: Re: ${
                      email.payload.headers.find(
                        (header) => header.name === "Subject"
                      ).value
                    }\r\n` +
                    `Content-Type: text/plain; charset="UTF-8"\r\n` +
                    `Content-Transfer-Encoding: 7bit\r\n\r\n` +
                    `Thank you for your email. I hope this message finds you well. Currently, I am out of the office on vacation and may not be able to respond immediately. I appreciate your patience, and I will make sure to get back to you as soon as possible upon my return.If your matter is urgent, please contact 9821020837.
  
  Best regards,
  Amartya Sen
  
                      \r\n`
                ).toString("base64"),
              },
            };

            await gmail.users.messages.send(replyMessage);

            await gmail.users.messages.modify({
              auth,
              userId: "me",
              id: message.id,
              resource: {
                addLabelIds: [labelId],
                removeLabelIds: ["INBOX"],
              },
            });
          }
        }
      }
    }, Math.floor(Math.random() * (120 - 45 + 1) + 45) * 1000);

    res.json({ "this is Auth": auth });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
