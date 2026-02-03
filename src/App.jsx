import { useEffect, useRef, useState } from 'react';
import './App.css'


const ICON_MAP = [
  "banana",
  "seven",
  "cherry",
  "plum",
  "orange",
  "bell",
  "bar",
  "lemon",
  "melon"
];
const ICON_WIDTH = 79;
const ICON_HEIGHT = 79;
const NUM_ICONS = 9;
const TIME_PER_ICON = 100;
const INDEXES = [0, 0, 0];

const STARTING_BALANCE = 100;


function TopBar({ balance, bet }) {
  return (
    <div className="top-bar">
      <h1>🎰 WHO WANNA PLAY SOME SLOTS? 🎰</h1>
      <BalanceAndBetDisplay balance={balance} bet={bet} />
    </div>
  );
}

function BalanceAndBetDisplay({ balance, bet }) {
  return (
    <div className="balance-bet-group">
      <div className="balance-box">Balance: ${balance.toFixed(2)}</div>
      <div className="bet-box">Bet: ${bet.toFixed(2)}</div>
    </div>
  );
}






function Slots({ bet, onSpin, onBetChange, balance, onPayout }) {
  const reelsRef = useRef([]);
  const [indexes, setIndexes] = useState([0, 0, 0]);
  const [winClass, setWinClass] = useState('');
  const [spinning, setSpinning] = useState(false);
  const [betInput, setBetInput] = useState(bet);
  const [matchMsg, setMatchMsg] = useState('');

  // Keep betInput in sync with bet prop
  useEffect(() => { setBetInput(bet); }, [bet]);

  // Roll one reel (returns a promise)
  function roll(reel, offset = 0) {
    const delta = (offset + 2) * NUM_ICONS + Math.round(Math.random() * NUM_ICONS);
    return new Promise((resolve) => {
      const style = reel.style;
      const backgroundPositionY = parseFloat(style.backgroundPositionY || '0');
      const targetBackgroundPositionY = backgroundPositionY + delta * ICON_HEIGHT;
      const normTargetBackgroundPositionY = targetBackgroundPositionY % (NUM_ICONS * ICON_HEIGHT);
      setTimeout(() => {
        style.transition = `background-position-y ${(8 + 1 * delta) * TIME_PER_ICON}ms cubic-bezier(.41,-0.01,.63,1.09)`;
        style.backgroundPositionY = `${backgroundPositionY + delta * ICON_HEIGHT}px`;
      }, offset * 150);
      setTimeout(() => {
        style.transition = 'none';
        style.backgroundPositionY = `${normTargetBackgroundPositionY}px`;
        resolve(delta % NUM_ICONS);
      }, (8 + 1 * delta) * TIME_PER_ICON + offset * 150);
    });
  }

  // Calculate payout for a given result (indexes array)
  function getPayout(result, bet) {
    // Payout table: symbol index -> payout multiplier for 2, 3, 4, 5 in a row
    // [2-match, 3-match, 4-match, 5-match]
    const payoutTable = [
      // banana, seven, cherry, plum, orange, bell, bar, lemon, melon
      [1, 5, 15, 50],    // banana
      [2, 10, 50, 200],  // seven
      [1, 4, 12, 40],    // cherry
      [1, 3, 10, 30],    // plum
      [1, 3, 8, 25],     // orange
      [1, 6, 20, 60],    // bell
      [2, 8, 30, 100],   // bar
      [1, 2, 6, 20],     // lemon
      [1, 4, 14, 45],    // melon
    ];
    // Find the longest run of the same symbol
    let maxRun = 1, run = 1, runSymbol = result[0], runStart = 0;
    for (let i = 1; i < result.length; ++i) {
      if (result[i] === result[i-1]) {
        run++;
        if (run > maxRun) {
          maxRun = run;
          runSymbol = result[i];
          runStart = i - run + 1;
        }
      } else {
        run = 1;
      }
    }
      let payout = 0;
      if (maxRun >= 2) {
        payout = payoutTable[runSymbol][maxRun-2] * bet;
      }
      let msg = '';
      if (maxRun >= 2) {
        msg = `${maxRun} matched!${payout > 0 ? ` 💵💰 You won $${payout} 💰💵` : ''}`;
      }
      return { payout, runSymbol, runStart, runLength: maxRun, msg };
  }

  // Roll all reels and handle win logic
  function rollAll() {
    if (spinning) return;
    setSpinning(true);
    setMatchMsg('');
    if (typeof onSpin === 'function') onSpin(); // Deduct bet from balance in parent
    const reelsList = reelsRef.current;
    Promise.all(reelsList.map((reel, i) => roll(reel, i))).then((deltas) => {
      setIndexes(prev => {
        const next = [...prev];
        deltas.forEach((delta, i) => next[i] = (next[i] + delta) % NUM_ICONS);
        // Win logic and payout
        const { payout, runSymbol, runStart, runLength, msg } = getPayout(next, bet);
        if (msg) {
          setMatchMsg(msg);
          setTimeout(() => setMatchMsg(''), 2000);
        }
        if (payout > 0) {
          setWinClass('win2');
          setTimeout(() => setWinClass(''), 2000);
          if (typeof onPayout === 'function') onPayout(payout);
        }
        return next;
      });
      setTimeout(() => setSpinning(false), 500);
    });
  }

  // Handlers for bet controls
  const handleBetInput = e => {
    let val = e.target.value.replace(/[^\d.]/g, '');
    val = val === '' ? '' : Math.max(1, Math.min(Number(val), balance));
    setBetInput(val);
    if (val !== '' && typeof onBetChange === 'function') onBetChange(Number(val));
  };
  const handleBetInc = () => {
    const newBet = Math.min(balance, Number(bet) + 1);
    setBetInput(newBet);
    if (typeof onBetChange === 'function') onBetChange(newBet);
  };
  const handleBetDec = () => {
    const newBet = Math.max(1, Number(bet) - 1);
    setBetInput(newBet);
    if (typeof onBetChange === 'function') onBetChange(newBet);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div className={`slots${winClass ? ' ' + winClass : ''}`}>
        {[0, 1, 2].map(i => (
          <div
            className="reel"
            key={i}
            ref={el => reelsRef.current[i] = el}
            style={{ backgroundPositionY: `${indexes[i] * ICON_HEIGHT}px` }}
          />
        ))}
      </div>
      {matchMsg && (
        <div style={{ marginTop: 12, minHeight: 24, fontWeight: 600, color: '#ffe066', fontSize: 18, textShadow: '0 1px 2px #222' }}>{matchMsg}</div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', marginTop: 8 }}>
        <div className="change-bet-container">
          <div className="change-bet-label">Change Bet</div>
          <div className="bet-row">
            <button
              className="bet-btn"
              onClick={handleBetDec}
              disabled={spinning || bet <= 1}
            >-</button>
            <input
              className="bet-input"
              type="number"
              min={1}
              max={balance}
              value={betInput}
              onChange={handleBetInput}
              disabled={spinning}
            />
            <button
              className="bet-btn"
              onClick={handleBetInc}
              disabled={spinning || bet >= balance}
            >+</button>
          </div>
        </div>
        <button className="spin-btn" onClick={rollAll} disabled={spinning || bet > balance} style={{ marginLeft: 18 }}>SPIN</button>
        <button
          className="max-bet-btn"
          onClick={() => {
            if (!spinning && bet !== balance && balance > 0 && typeof onBetChange === 'function') onBetChange(balance);
          }}
          disabled={spinning || bet === balance || balance <= 0}
        >
          Max Bet
        </button>
      </div>
    </div>
  );
}



function Img() {
  return (
    <img style={{position: "fixed", left: 0, top: 0, height: "100vh", width: "auto"}} src="https://assets.codepen.io/439000/slotreel.webp" />
  )
}


function App() {
  const [balance, setBalance] = useState(STARTING_BALANCE);
  const [bet, setBet] = useState(1);

  // Deduct bet from balance on spin
  const handleSpin = () => {
    setBalance(bal => Math.max(0, bal - bet));
  };
  // Update bet from Slots controls
  const handleBetChange = (val) => {
    setBet(Math.max(1, Math.min(Number(val), balance)));
  };
  // Add payout to balance
  const handlePayout = (amount) => {
    setBalance(bal => bal + amount);
  };

  return (
    <>
      <TopBar balance={balance} bet={bet} />
      <div className="card">
        <div style={{ margin: '32px 0' }}>
          <Slots bet={bet} onSpin={handleSpin} onBetChange={handleBetChange} balance={balance} onPayout={handlePayout} />
          {/* <Img /> */}
        </div>
      </div>
    </>
  );
}

export default App;