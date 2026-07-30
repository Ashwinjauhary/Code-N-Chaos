import { motion } from 'framer-motion';

interface AntiCheatOverlayProps {
  hasStarted: boolean;
  onStart: () => void;
  showWarningModal: boolean;
  warningMessage: string;
  onDismissWarning: () => void;
  warnings?: number;
  maxWarnings?: number;
}

export default function AntiCheatOverlay({
  hasStarted,
  onStart,
  showWarningModal,
  warningMessage,
  onDismissWarning,
  warnings = 0,
  maxWarnings = 3,
}: AntiCheatOverlayProps) {
  
  if (!hasStarted) {
    return (
      <div className="anti-cheat-overlay">
        <motion.div 
          className="anti-cheat-modal"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <h2>Assessment Ready</h2>
          <p>
            This is a proctored assessment. 
            <br/><br/>
            <strong>Rules:</strong><br/>
            1. You must remain in fullscreen mode.<br/>
            2. Switching tabs or opening other windows is prohibited.<br/>
            3. Copying and pasting is disabled.<br/>
            <br/>
            Violating these rules will result in warnings. After {maxWarnings} warnings, your test will be automatically submitted.
          </p>
          <button className="btn-primary" onClick={onStart} style={{ marginTop: '1rem', width: '100%' }}>
            Start & Enter Fullscreen
          </button>
        </motion.div>
      </div>
    );
  }

  if (showWarningModal) {
    return (
      <div className="anti-cheat-overlay warning-bg">
        <motion.div 
          className="anti-cheat-modal warning"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <h2>⚠️ Security Warning ({warnings}/{maxWarnings})</h2>
          <p>{warningMessage}</p>
          <p style={{ fontSize: '0.9rem', opacity: 0.8, marginTop: '1rem' }}>
            {warnings >= maxWarnings ? 
              "This is your FINAL warning. Next violation will submit your assessment." : 
              "Continued violations will result in automatic submission of your assessment."}
          </p>
          <button className="btn-primary" onClick={onDismissWarning} style={{ marginTop: '1.5rem', width: '100%' }}>
            I Understand
          </button>
        </motion.div>
      </div>
    );
  }

  return null;
}
