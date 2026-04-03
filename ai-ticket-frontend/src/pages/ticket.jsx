import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";

export default function TicketDetailsPage() {
  const { id } = useParams();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const token = localStorage.getItem("token");

  useEffect(() => {
    // 🔹 Fetch user email using userId
    const fetchAssignedEmail = async (userId) => {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_SERVER_URL}/auth/user/${userId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await res.json();
        // console.log("Assigned user data:", data); 

        if (res.ok) {
         
          setEmail(data.email);
          setUsername(data.username); 
        } else {
          console.error("Failed to fetch assigned email1", data.message);
        }
      } catch (err) {
        console.error("Error fetching assigned email2", err);
      }
    };

    // 🔹 Fetch ticket using ticket ID
    const fetchTicket = async () => {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_SERVER_URL}/tickets/${id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await res.json();

        if (res.ok) {
          setTicket(data.ticket);

          // 🔹 Now fetch user email using assignedTo (userId)
          if (data.ticket.assignedTo) {
            fetchAssignedEmail(data.ticket.assignedTo);
          }
        } else {
          alert(data.message || "Failed to fetch ticket");
        }
      } catch (err) {
        console.error(err);
        alert("Something went wrong");
      } finally {
        setLoading(false);
      }
    };

    fetchTicket();
  }, [id]);

  // 🔹 Loading state
  if (loading)
    return <div className="text-center mt-10">Loading ticket details...</div>;

  // 🔹 No ticket found
  if (!ticket)
    return <div className="text-center mt-10">Ticket not found</div>;

  return (
    <div className="max-w-3xl mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">Ticket Details</h2>

      <div className="card bg-gray-800 shadow p-4 space-y-4">
        <h3 className="text-xl font-semibold">{ticket.title}</h3>
        <p>{ticket.description}</p>

        {/* 🔹 Extra details */}
        {ticket.status && (
          <>
            <div className="divider">Metadata</div>

            <p>
              <strong>Status:</strong> {ticket.status}
            </p>

            {ticket.priority && (
              <p>
                <strong>Priority:</strong> {ticket.priority}
              </p>
            )}

            {ticket.relatedSkills?.length > 0 && (
              <p>
                <strong>Related Skills:</strong>{" "}
                {ticket.relatedSkills.join(", ")}
              </p>
            )}

            {ticket.helpfulNotes && (
              <div>
                <strong>Helpful Notes:</strong>
                <div className="prose max-w-none rounded mt-2">
                  <ReactMarkdown>{ticket.helpfulNotes}</ReactMarkdown>
                </div>
              </div>
            )}

            {/* 🔹 Email from second API */}
            {ticket.assignedTo && (
              <p>
                <strong>Assigned To:</strong> {username || email || "Loading..."}
              </p>
            )}

            {ticket.createdAt && (
              <p className="text-sm text-gray-500 mt-2">
                Created At:{" "}
                {new Date(ticket.createdAt).toLocaleString()}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}