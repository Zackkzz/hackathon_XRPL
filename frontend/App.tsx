import React, { useState } from 'react'
import './App.css'

function App() {
  const [activeTab, setActiveTab] = useState<'create' | 'manage'>('create')
  const [walletAddress] = useState('rN7n7otQDd6FczFgLdSqtcsAUxDkw6fzRH')
  const [formData, setFormData] = useState({
    amount: '1000',
    destinationAddress: 'rU6K7V3Po4snVhBBaU29sesqs2qTQJWDw1',
    finishAfter: '',
    cancelAfter: '',
    condition: 'A0258020E3B0C44298FC1C149AFBF4C8996FB92427AE41E4649B934CA49599187852B855810100'
  })

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    // You can add a toast notification here
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Handle form submission here
    console.log('Form submitted:', formData)
  }

  return (
    <div className="app">
      <header className="header">
        <h1 className="title">XRP Ledger Escrow</h1>
        <p className="subtitle">Secure payment booking with smart escrow features</p>
      </header>

      <div className="note-box">
        <strong>Note:</strong> This is a demo interface. To use with real XRP Ledger, install the{' '}
        <a href="https://www.npmjs.com/package/xrpl" target="_blank" rel="noopener noreferrer" className="link">
          xrpl
        </a>{' '}
        library and replace mock functions with actual blockchain transactions.
      </div>

      <div className="wallet-section">
        <label className="wallet-label">Wallet Address</label>
        <div className="wallet-input-container">
          <input
            type="text"
            value={walletAddress}
            readOnly
            className="wallet-input"
          />
          <button
            type="button"
            onClick={() => copyToClipboard(walletAddress)}
            className="copy-button"
            aria-label="Copy wallet address"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M5.5 3.5H3.5C2.67157 3.5 2 4.17157 2 5V12.5C2 13.3284 2.67157 14 3.5 14H11C11.8284 14 12.5 13.3284 12.5 12.5V10.5M5.5 3.5C5.5 2.67157 6.17157 2 7 2H9.5C10.3284 2 11 2.67157 11 3.5V6C11 6.82843 10.3284 7.5 9.5 7.5H7C6.17157 7.5 5.5 6.82843 5.5 6V3.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'create' ? 'active' : ''}`}
          onClick={() => setActiveTab('create')}
        >
          Create Escrow
        </button>
        <button
          className={`tab ${activeTab === 'manage' ? 'active' : ''}`}
          onClick={() => setActiveTab('manage')}
        >
          Manage Escrows
        </button>
      </div>

      {activeTab === 'create' && (
        <div className="create-escrow-section">
          <div className="section-header">
            <h2 className="section-title">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M15 8.33333H14.1667V6.66667C14.1667 4.08934 12.0773 2 9.5 2C6.92267 2 4.83333 4.08934 4.83333 6.66667V8.33333H4C3.07952 8.33333 2.33333 9.07952 2.33333 10V16.6667C2.33333 17.5871 3.07952 18.3333 4 18.3333H15C15.9205 18.3333 16.6667 17.5871 16.6667 16.6667V10C16.6667 9.07952 15.9205 8.33333 15 8.33333ZM6.5 6.66667C6.5 4.82572 8.15905 3.16667 10 3.16667C11.841 3.16667 13.5 4.82572 13.5 6.66667V8.33333H6.5V6.66667ZM15 16.6667H4V10H15V16.6667Z" fill="currentColor"/>
              </svg>
              Create New Escrow
            </h2>
            <p className="section-description">
              Set up a conditional payment that will be held in escrow until the specified conditions are met.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="escrow-form">
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="amount" className="form-label">
                  Amount (XRP) <span className="required">*</span>
                </label>
                <input
                  type="number"
                  id="amount"
                  name="amount"
                  value={formData.amount}
                  onChange={handleInputChange}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="destinationAddress" className="form-label">
                  Destination Address <span className="required">*</span>
                </label>
                <input
                  type="text"
                  id="destinationAddress"
                  name="destinationAddress"
                  value={formData.destinationAddress}
                  onChange={handleInputChange}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="finishAfter" className="form-label">
                  Finish After <span className="required">*</span>
                </label>
                <div className="date-input-container">
                  <input
                    type="datetime-local"
                    id="finishAfter"
                    name="finishAfter"
                    value={formData.finishAfter}
                    onChange={handleInputChange}
                    className="form-input date-input"
                    required
                  />
                </div>
                <p className="form-helper">Earliest time the escrow can be finished</p>
              </div>

              <div className="form-group">
                <label htmlFor="cancelAfter" className="form-label">
                  Cancel After (Optional)
                </label>
                <div className="date-input-container">
                  <input
                    type="datetime-local"
                    id="cancelAfter"
                    name="cancelAfter"
                    value={formData.cancelAfter}
                    onChange={handleInputChange}
                    className="form-input date-input"
                  />
                </div>
                <p className="form-helper">Time after which the escrow can be cancelled</p>
              </div>

              <div className="form-group form-group-full">
                <label htmlFor="condition" className="form-label">
                  Condition (Optional)
                </label>
                <input
                  type="text"
                  id="condition"
                  name="condition"
                  value={formData.condition}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="Crypto-condition in hexadecimal format"
                />
                <p className="form-helper">Crypto-condition in hexadecimal format (PREIMAGE-SHA-256)</p>
              </div>
            </div>

            <button type="submit" className="submit-button">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M15 8.33333H14.1667V6.66667C14.1667 4.08934 12.0773 2 9.5 2C6.92267 2 4.83333 4.08934 4.83333 6.66667V8.33333H4C3.07952 8.33333 2.33333 9.07952 2.33333 10V16.6667C2.33333 17.5871 3.07952 18.3333 4 18.3333H15C15.9205 18.3333 16.6667 17.5871 16.6667 16.6667V10C16.6667 9.07952 15.9205 8.33333 15 8.33333ZM6.5 6.66667C6.5 4.82572 8.15905 3.16667 10 3.16667C11.841 3.16667 13.5 4.82572 13.5 6.66667V8.33333H6.5V6.66667ZM15 16.6667H4V10H15V16.6667Z" fill="currentColor"/>
              </svg>
              Create Escrow
            </button>
          </form>
        </div>
      )}

      {activeTab === 'manage' && (
        <div className="manage-escrow-section">
          <h2 className="section-title">Manage Escrows</h2>
          <p className="section-description">View and manage your existing escrows.</p>
          {/* Manage escrows content will go here */}
        </div>
      )}

      <div className="about-section">
        <h3 className="about-title">About XRP Ledger Escrow</h3>
        <div className="about-content">
          <div className="about-item">
            <strong>Time-based Escrow:</strong> Funds are held until a specific time has passed. Use{' '}
            <span className="highlight">FinishAfter</span> to set when the escrow can be executed.
          </div>
          <div className="about-item">
            <strong>Conditional Escrow:</strong> Funds are held until a cryptographic condition is met. Use{' '}
            <span className="highlight">PREIMAGE-SHA-256 crypto-conditions</span> for secure, verifiable releases.
          </div>
          <div className="about-item">
            <strong>Cancellation:</strong> Set a <span className="highlight">CancelAfter</span> time to allow the sender to reclaim funds if the escrow isn't finished by that time.
          </div>
        </div>
      </div>

      <footer className="footer">
        <div className="footer-left">
          <button className="privacy-button">Do not sell or share my personal info</button>
        </div>
        <div className="footer-right">
          <button className="help-button" aria-label="Help">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2ZM10 16C6.68629 16 4 13.3137 4 10C4 6.68629 6.68629 4 10 4C13.3137 4 16 6.68629 16 10C16 13.3137 13.3137 16 10 16Z" fill="currentColor"/>
              <path d="M10 6C9.44772 6 9 6.44772 9 7V10C9 10.5523 9.44772 11 10 11C10.5523 11 11 10.5523 11 10V7C11 6.44772 10.5523 6 10 6Z" fill="currentColor"/>
              <path d="M10 12C9.44772 12 9 12.4477 9 13C9 13.5523 9.44772 14 10 14C10.5523 14 11 13.5523 11 13C11 12.4477 10.5523 12 10 12Z" fill="currentColor"/>
            </svg>
          </button>
        </div>
      </footer>
    </div>
  )
}

export default App
