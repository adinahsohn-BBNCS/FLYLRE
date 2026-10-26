export const CONTACT_TOPICS = [
  "General question",
  "Visiting or fly-in permission",
  "Events",
  "Website feedback",
] as const;

/** FormSubmit destination for the "check for messages" alert: an email, or the alias FormSubmit issues after activation. */
export const ADMIN_ALERT_DESTINATION = "contact@flylre.com";

/** Roundcube webmail for info@flylre.com — admin Reply opens a pre-filled draft here. */
export const WEBMAIL_URL = "https://cloudhost-741777.us-west-1.nxcli.net:2443/roundcube/";

const MAX_QUOTED_CHARS = 1500;

export function webmailReplyUrl(reply: {
  email: string;
  name: string;
  topic: string;
  message: string;
  sentAt: string;
}): string {
  const quoted = reply.message.length > MAX_QUOTED_CHARS
    ? `${reply.message.slice(0, MAX_QUOTED_CHARS)}…`
    : reply.message;
  const sentOn = new Date(reply.sentAt).toLocaleString();
  const body = `\n\n\nOn ${sentOn}, ${reply.name} wrote:\n${quoted
    .split("\n")
    .map((line) => `> ${line}`)
    .join("\n")}`;

  const mailto = `mailto:${reply.email}?subject=${encodeURIComponent(`Re: ${reply.topic}`)}&body=${encodeURIComponent(body)}`;
  return `${WEBMAIL_URL}?_task=mail&_action=compose&to=${encodeURIComponent(mailto)}`;
}
