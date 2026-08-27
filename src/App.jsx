import { useState, useMemo, useEffect } from "react";
import "./App.css";

const initialSuppliers = [
  { id: "SUP001", name: "ABC Metals", material: "Steel Rod", onTimeDeliveries: 90, totalDeliveries: 100, qualityRejects: 3, totalReceived: 100, poExceptions: 2, status: "Approved" },
  { id: "SUP002", name: "XYZ Ltd", material: "Copper Wire", onTimeDeliveries: 70, totalDeliveries: 100, qualityRejects: 15, totalReceived: 100, poExceptions: 8, status: "High Risk" },
  { id: "SUP003", name: "Global Parts", material: "Bolts", onTimeDeliveries: 100, totalDeliveries: 100, qualityRejects: 0, totalReceived: 100, poExceptions: 0, status: "Approved" },
  { id: "SUP004", name: "Prime Supplies", material: "Bearings", onTimeDeliveries: 80, totalDeliveries: 100, qualityRejects: 12, totalReceived: 100, poExceptions: 5, status: "Watchlist" },
  { id: "SUP005", name: "Edge Corp", material: "Gloves", onTimeDeliveries: 50, totalDeliveries: 100, qualityRejects: 25, totalReceived: 100, poExceptions: 10, status: "High Risk" },
];

export default function App() {
  const [supplierList, setSupplierList] = useState(() => {
    const saved = localStorage.getItem("supplierData");
    return saved ? JSON.parse(saved) : initialSuppliers;
  });

  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [newSupplier, setNewSupplier] = useState({ name: "", material: "", qualityRejects: "", poExceptions: "" });

  // AI CHAT STATES
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [chatInput, setChatInput] = useState("");

  useEffect(() => {
    localStorage.setItem("supplierData", JSON.stringify(supplierList));
  }, [supplierList]);

  const totalSuppliers = supplierList.length;
  const highRisk = supplierList.filter(s => s.status === "High Risk").length;
  const avgOnTime = Math.round(supplierList.reduce((sum, s) => sum + (s.onTimeDeliveries / s.totalDeliveries * 100), 0) / totalSuppliers);
  const avgQuality = Math.round(supplierList.reduce((sum, s) => sum + (s.qualityRejects / s.totalReceived * 100), 0) / totalSuppliers);

  const filteredSuppliers = useMemo(() => {
    return supplierList.filter(s => 
      s.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
      s.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [supplierList, searchTerm]);

  const getAISummary = (supplier) => {
    const latePct = 100 - (supplier.onTimeDeliveries / supplier.totalDeliveries * 100);
    const rejectPct = (supplier.qualityRejects / supplier.totalReceived * 100);
    let summary = "";
    let risk = "";

    if (latePct > 20 || rejectPct > 10) {
      summary = `Supplier ${supplier.name} is at HIGH RISK. ${latePct.toFixed(0)}% of deliveries are late and the quality rejection rate is ${rejectPct.toFixed(0)}%. Recommend placing a sourcing block.`;
      risk = "🔴 HIGH";
    } else if (latePct > 10 || rejectPct > 5) {
      summary = `Supplier ${supplier.name} is on WATCHLIST. Late delivery rate is ${latePct.toFixed(0)}% and quality rejections are at ${rejectPct.toFixed(0)}%. Recommend issuing a formal warning.`;
      risk = "🟡 MEDIUM";
    } else {
      summary = `Supplier ${supplier.name} is RELIABLE. ${latePct.toFixed(0)}% late rate, ${rejectPct.toFixed(0)}% rejection rate. No action required.`;
      risk = "🟢 LOW";
    }
    return { summary, risk };
  };

  const handleSelectSupplier = (supplier) => {
    setSelectedSupplier(supplier);
    setErrorMessage("");
    setSuccessMessage("");
    
    // Reset chat when a new supplier is selected
    setChatHistory([]);
    setChatInput("");
    
    // Add initial AI message
    setChatHistory([{ role: "ai", text: getAISummary(supplier).summary }]);
  };

  const handleAskAI = (e) => {
    e.preventDefault();
    if (!selectedSupplier || !chatInput.trim()) return;

    const question = chatInput.toLowerCase();
    let response = "";

    if (question.includes("late") || question.includes("delivery")) {
      response = `Based on data for ${selectedSupplier.id}: On-time delivery rate is ${selectedSupplier.onTimeDeliveries}/${selectedSupplier.totalDeliveries} (${Math.round(selectedSupplier.onTimeDeliveries / selectedSupplier.totalDeliveries * 100)}%).`;
    } else if (question.includes("quality") || question.includes("reject")) {
      response = `Based on data for ${selectedSupplier.id}: Quality rejection rate is ${selectedSupplier.qualityRejects}/${selectedSupplier.totalReceived} (${Math.round(selectedSupplier.qualityRejects / selectedSupplier.totalReceived * 100)}%).`;
    } else if (question.includes("action") || question.includes("do")) {
      response = `Recommended action for ${selectedSupplier.id}: ${getAISummary(selectedSupplier).summary}`;
    } else {
      response = `I am grounded to the data of ${selectedSupplier.id}. Please ask about delivery rates, quality issues, or recommended actions.`;
    }

    // Add user question and AI response to chat history
    setChatHistory(prev => [...prev, { role: "user", text: chatInput }, { role: "ai", text: response }]);
    setChatInput("");
  };

  const handleAction = (action) => {
    setErrorMessage("");
    setSuccessMessage("");

    if (!selectedSupplier) return;

    const rejectPct = (selectedSupplier.qualityRejects / selectedSupplier.totalReceived * 100);
    if (action === "Approved" && rejectPct > 10) {
      setErrorMessage("Validation Failed: Cannot approve a supplier with a quality rejection rate above 10%.");
      return;
    }

    setSupplierList(prev => prev.map(s => 
      s.id === selectedSupplier.id ? { ...s, status: action } : s
    ));
    setSelectedSupplier(prev => ({ ...prev, status: action }));
    setSuccessMessage(`Decision recorded: ${action} for ${selectedSupplier.id}`);
  };

  const handleAddSupplier = (e) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!newSupplier.name || !newSupplier.material || !newSupplier.qualityRejects || !newSupplier.poExceptions) {
      setErrorMessage("Validation Failed: All fields (Name, Material, Quality Rejects, PO Exceptions) are required.");
      return;
    }

    const newSupplierData = {
      id: `SUP${String(supplierList.length + 1).padStart(3, '0')}`,
      name: newSupplier.name,
      material: newSupplier.material,
      onTimeDeliveries: 100, totalDeliveries: 100,
      qualityRejects: Number(newSupplier.qualityRejects), totalReceived: 100,
      poExceptions: Number(newSupplier.poExceptions),
      status: "Watchlist"
    };

    setSupplierList([...supplierList, newSupplierData]);
    setNewSupplier({ name: "", material: "", qualityRejects: "", poExceptions: "" });
    setSuccessMessage("New supplier added successfully!");
  };

  const getStatusIcon = (status) => {
    if (status === "Approved") return "🟢";
    if (status === "High Risk") return "🔴";
    return "🟡";
  };

  return (
    <div className="app-container">
      
      {/* RESET DATA BUTTON */}
      <div style={{ textAlign: 'right', marginBottom: '10px' }}>
        <button 
          className="btn btn-escalate" 
          onClick={() => { localStorage.removeItem("supplierData"); window.location.reload(); }}
        >
          Reset Demo Data
        </button>
      </div>

      <header className="dashboard-header">
        <h1>SUPPLIER PERFORMANCE COCKPIT</h1>
        <p>S2P - Supplier Evaluation & Risk Monitoring</p>
      </header>

      {/* KPI SECTION */}
      <div className="kpi-cards">
        <div className="kpi-card"><span className="kpi-label">Total Suppliers</span><span className="kpi-value">{totalSuppliers}</span></div>
        <div className="kpi-card"><span className="kpi-label">High Risk</span><span className="kpi-value red">{highRisk}</span></div>
        <div className="kpi-card"><span className="kpi-label">Avg On-Time %</span><span className="kpi-value success">{avgOnTime}%</span></div>
        <div className="kpi-card"><span className="kpi-label">Avg Quality Rejection %</span><span className="kpi-value amber">{avgQuality}%</span></div>
      </div>

      {/* MESSAGES */}
      {errorMessage && <div className="error-alert">{errorMessage}</div>}
      {successMessage && <div className="success-alert">{successMessage}</div>}

      {/* ADD NEW SUPPLIER FORM */}
      <form className="add-po-form" onSubmit={handleAddSupplier}>
        <input type="text" placeholder="Supplier Name (Required)" value={newSupplier.name} onChange={(e) => setNewSupplier({...newSupplier, name: e.target.value})} />
        <input type="text" placeholder="Material (Required)" value={newSupplier.material} onChange={(e) => setNewSupplier({...newSupplier, material: e.target.value})} />
        <input type="number" placeholder="Quality Rejects (Required)" value={newSupplier.qualityRejects} onChange={(e) => setNewSupplier({...newSupplier, qualityRejects: e.target.value})} />
        <input type="number" placeholder="PO Exceptions (Required)" value={newSupplier.poExceptions} onChange={(e) => setNewSupplier({...newSupplier, poExceptions: e.target.value})} />
        <button type="submit" className="btn btn-approve">Add Supplier</button>
      </form>

      {/* SEARCH */}
      <div className="controls">
        <input type="text" placeholder="Search Supplier / ID" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
      </div>

      <div className="main-layout">
        {/* MAIN TABLE */}
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Supplier</th>
                <th>Material</th>
                <th>On-Time %</th>
                <th>Quality Rej. %</th>
                <th>PO Exceptions</th>
                <th>Status</th>
                <th>Risk</th>
              </tr>
            </thead>
            <tbody>
              {filteredSuppliers.map(s => (
                <tr key={s.id} onClick={() => handleSelectSupplier(s)} className={selectedSupplier?.id === s.id ? "active-row" : ""}>
                  <td>{s.id} - {s.name}</td>
                  <td>{s.material}</td>
                  <td>{Math.round(s.onTimeDeliveries / s.totalDeliveries * 100)}%</td>
                  <td className={s.qualityRejects / s.totalReceived * 100 > 10 ? "text-red" : ""}>{Math.round(s.qualityRejects / s.totalReceived * 100)}%</td>
                  <td>{s.poExceptions}</td>
                  <td className={s.status === "High Risk" ? "status-blocked" : (s.status === "Approved" ? "status-matched" : "status-watch")}>{s.status}</td>
                  <td>{getStatusIcon(s.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* DETAIL DECISION SCREEN */}
        <div className="right-panel">
          {selectedSupplier ? (
            <div className="details-box">
              <h2>{selectedSupplier.id} — {selectedSupplier.name.toUpperCase()}</h2>
              
              <div className="details-grid-3">
                <div className="detail-item"><span>On-Time Rate</span><strong>{Math.round(selectedSupplier.onTimeDeliveries / selectedSupplier.totalDeliveries * 100)}%</strong></div>
                <div className="detail-item"><span>Quality Rate</span><strong className={selectedSupplier.qualityRejects / selectedSupplier.totalReceived * 100 > 10 ? "text-red" : ""}>{Math.round(selectedSupplier.qualityRejects / selectedSupplier.totalReceived * 100)}%</strong></div>
                <div className="detail-item"><span>PO Exceptions</span><strong>{selectedSupplier.poExceptions}</strong></div>
              </div>

              {/* AI ANALYSIS SECTION */}
              <div className="ai-box">
                <h4>🤖 AI SUPPLIER RISK ANALYSIS</h4>
                <p>{getAISummary(selectedSupplier).summary}</p>
                <p className="risk-level">Risk Level: {getAISummary(selectedSupplier).risk}</p>
              </div>

              {/* ACTION BUTTONS */}
              <div className="action-buttons">
                <button className="btn btn-approve" onClick={() => handleAction("Approved")}>Approve Supplier</button>
                <button className="btn btn-clarify" onClick={() => handleAction("Watchlist")}>Add to Watchlist</button>
                <button className="btn btn-escalate" onClick={() => handleAction("Escalated")}>Escalate to Sourcing</button>
              </div>
            </div>
          ) : (
            <div className="placeholder">
              <span>👈</span>
              <h2>Select a Supplier</h2>
              <p>Click on a row to view supplier risk levels and AI insights.</p>
            </div>
          )}
        </div>
      </div>

      {/* FLOATING AI CHAT WINDOW */}
      <div className={`ai-chat-window ${isChatOpen ? "open" : ""}`}>
        {isChatOpen && (
          <>
            <div className="chat-header">
              <span>🤖 AI Assistant</span>
              <button onClick={() => setIsChatOpen(false)} className="chat-close-btn">✕</button>
            </div>
            <div className="chat-body">
              {selectedSupplier ? (
                <>
                  {chatHistory.map((msg, index) => (
                    <div key={index} className={`chat-message ${msg.role}`}>
                      {msg.text}
                    </div>
                  ))}
                </>
              ) : (
                <div className="chat-placeholder">Select a supplier to start asking questions.</div>
              )}
            </div>
            <form onSubmit={handleAskAI} className="chat-input-area">
              <input 
                type="text" 
                placeholder="Ask about delivery, quality..." 
                value={chatInput} 
                onChange={(e) => setChatInput(e.target.value)} 
                disabled={!selectedSupplier}
              />
              <button type="submit" className="chat-send-btn">➤</button>
            </form>
          </>
        )}
      </div>

      {/* FLOATING AI BUBBLE */}
      <div className="ai-float-bubble" onClick={() => setIsChatOpen(!isChatOpen)}>
        {isChatOpen ? "✕" : "🤖"}
      </div>
    </div>
  );
}