# 🌍 Blockchain-based Public Consultation Platform

Welcome to a revolutionary way to democratize decision-making! This Web3 project addresses the real-world problem of biased and non-inclusive public consultations in governance, policy-making, and corporate decisions. Traditional systems often exclude diverse voices due to accessibility barriers, lack of incentives, and opacity. Using the Stacks blockchain and Clarity smart contracts, this platform enables entities (governments, NGOs, companies) to post consultations, crowdsource diverse inputs from the public, and reward participants with tokens—ensuring transparency, immutability, and fair compensation for contributions.

By leveraging blockchain, we prevent manipulation, track participation pseudonymously, and use smart contracts to enforce diversity quotas (e.g., based on anonymized demographics like region or expertise, without revealing personal data). This fosters more equitable outcomes, such as better urban planning or policy reforms that reflect global perspectives.

## ✨ Features

📢 Post consultations with clear questions and reward pools  
🗣️ Submit inputs (text, votes, or proposals) as a participant  
💰 Earn tokens for quality contributions, with bonuses for underrepresented groups  
🌐 Ensure diversity through automated checks (e.g., minimum inputs from different regions or categories)  
🔒 Immutable records of all submissions and rewards  
📊 Analytics on consultation outcomes, verifiable on-chain  
🛡️ Governance for platform upgrades via token holders  
🚫 Anti-spam measures to prevent duplicate or low-effort inputs  

## 🛠 How It Works

This project is built on the Stacks blockchain using Clarity for secure, auditable smart contracts. It involves 8 interconnected smart contracts to handle modularity and scalability. Here's a high-level overview:

### Smart Contracts Overview
1. **ConsultationFactory.clar**: Deploys new consultation instances dynamically. Entities call it to create a consultation with parameters like topic, deadline, reward pool, and diversity criteria.
2. **ConsultationCore.clar**: Manages the lifecycle of a single consultation—handling submissions, storing inputs as hashes for privacy, and enforcing rules like one-submission-per-user.
3. **TokenMint.clar**: A fungible token contract (e.g., based on SIP-010) for minting and managing the platform's reward tokens (CONSULT tokens).
4. **RewardEscrow.clar**: Holds funds (STX or tokens) in escrow for consultations, releasing them only after successful completion and diversity verification.
5. **DiversityVerifier.clar**: Analyzes submissions for diversity (e.g., using anonymized tags like "region:EU" or "expertise:environment"). It checks against predefined quotas and flags consultations that fail to meet them.
6. **InputValidator.clar**: Validates submissions for quality (e.g., minimum length, uniqueness via hash checks) and integrates with oracles if needed for external verification.
7. **RewardDistributor.clar**: Calculates and distributes rewards post-consultation. Uses algorithms to allocate based on input quality (voted by peers) and diversity bonuses (e.g., extra tokens for inputs from underrepresented categories).
8. **PlatformGovernance.clar**: Allows token holders to vote on platform parameters, like reward rates or diversity metrics, ensuring community-driven evolution.

### For Consultation Creators (e.g., Governments or Orgs)
- Fund a reward pool in STX or tokens.
- Call `ConsultationFactory` to deploy a new consultation with:
  - Topic and questions.
  - Deadline and diversity requirements (e.g., at least 20% inputs from emerging markets).
  - Total reward amount.
- Once deployed, the `ConsultationCore` contract goes live, and `RewardEscrow` locks the funds.

Boom! Your consultation is open, transparent, and incentivized.

### For Participants (Public Consultants)
- Register pseudonymously via `UserRegistry` (optional helper contract, not counted in the 8, for tagging diversity info without doxxing).
- Submit your input to `ConsultationCore` with a hash of your response, category tags, and any supporting data.
- The `InputValidator` checks for validity, and `DiversityVerifier` logs your contribution toward quotas.
- After the deadline, if diversity is met, `RewardDistributor` pays out tokens proportional to your input's value (e.g., upvoted by others) plus bonuses for diversity.

That's it! Get rewarded for sharing your voice, while ensuring consultations capture a broad spectrum of inputs.

### Reward System Details
To encourage diverse participation:
- Base rewards are distributed from the escrow pool based on submission quality (e.g., community votes via `ConsultationCore`).
- Diversity bonuses: Extra tokens (e.g., 1.5x multiplier) for inputs from underrepresented groups, verified on-chain without revealing identities.
- Anti-gaming: Use proof-of-uniqueness (hashes) and rate limits to prevent spam.
- All transactions are immutable, so rewards are fair and auditable.

This setup solves real issues like echo chambers in decision-making by incentivizing global, diverse input—perfect for climate policy consultations or community feedback on urban development!