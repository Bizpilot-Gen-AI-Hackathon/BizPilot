import { useState } from "react";

const initialMessage = {
    recipient: "",
    channel: "sms",
    subject: "",
    message: "",
};

export default function MessageComposer({
    onSend,
    recipients = [],
    sending = false,
}) {
    const [form, setForm] = useState(initialMessage);
    const [error, setError] = useState("");

    function updateField(field, value) {
        setForm((current) => ({
            ...current,
            [field]: value,
        }));

        setError("");
    }

    function handleSubmit(event) {
        event.preventDefault();

        if (!form.recipient.trim()) {
            setError("Enter a recipient before continuing.");
            return;
        }

        if (!form.message.trim()) {
            setError("Enter a message before continuing.");
            return;
        }

        if (typeof onSend !== "function") {
            setError(
                "Message delivery is not connected yet. Your message has not been sent."
            );
            return;
        }

        onSend({
            ...form,
            recipient: form.recipient.trim(),
            subject: form.subject.trim(),
            message: form.message.trim(),
        });
    }

    return (
        <section className="oh-panel oh-message-composer">
            <div className="oh-panel-header">
                <div>
                    <h2>Compose message</h2>
                    <p>Prepare a message for a customer or supplier</p>
                </div>
            </div>

            <form className="oh-form" onSubmit={handleSubmit}>
                <div className="oh-form-field">
                    <label htmlFor="oh-message-channel">Channel</label>

                    <select
                        id="oh-message-channel"
                        value={form.channel}
                        onChange={(event) =>
                            updateField("channel", event.target.value)
                        }
                    >
                        <option value="sms">SMS</option>
                        <option value="whatsapp">WhatsApp</option>
                        <option value="email">Email</option>
                    </select>
                </div>

                <div className="oh-form-field">
                    <label htmlFor="oh-message-recipient">Recipient</label>

                    {recipients.length > 0 ? (
                        <select
                            id="oh-message-recipient"
                            value={form.recipient}
                            onChange={(event) =>
                                updateField("recipient", event.target.value)
                            }
                        >
                            <option value="">Select a recipient</option>

                            {recipients.map((recipient, index) => (
                                <option
                                    key={recipient.id ?? index}
                                    value={
                                        recipient.email ||
                                        recipient.phone ||
                                        recipient.contact
                                    }
                                >
                                    {recipient.name} —{" "}
                                    {recipient.email ||
                                        recipient.phone ||
                                        recipient.contact}
                                </option>
                            ))}
                        </select>
                    ) : (
                        <input
                            id="oh-message-recipient"
                            type="text"
                            value={form.recipient}
                            onChange={(event) =>
                                updateField("recipient", event.target.value)
                            }
                            placeholder={
                                form.channel === "email"
                                    ? "Enter email address"
                                    : "Enter phone number"
                            }
                            autoComplete="off"
                        />
                    )}
                </div>

                {form.channel === "email" && (
                    <div className="oh-form-field">
                        <label htmlFor="oh-message-subject">Subject</label>

                        <input
                            id="oh-message-subject"
                            type="text"
                            value={form.subject}
                            onChange={(event) =>
                                updateField("subject", event.target.value)
                            }
                            placeholder="Enter email subject"
                        />
                    </div>
                )}

                <div className="oh-form-field">
                    <label htmlFor="oh-message-body">Message</label>

                    <textarea
                        id="oh-message-body"
                        value={form.message}
                        onChange={(event) =>
                            updateField("message", event.target.value)
                        }
                        placeholder="Write your message"
                        rows={6}
                    />

                    <span className="oh-field-hint">
                        {form.message.length} characters
                    </span>
                </div>

                {error && (
                    <p className="oh-form-error" role="alert">
                        {error}
                    </p>
                )}

                <div className="oh-form-actions">
                    <button
                        type="submit"
                        className="oh-button oh-button-primary"
                        disabled={sending}
                    >
                        {sending ? "Processing..." : "Send message"}
                    </button>
                </div>
            </form>
        </section>
    );
}