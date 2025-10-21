import { describe, it, expect, beforeEach } from "vitest";
import { ClarityValue, ResponseCV, UIntCV, PrincipalCV, StringAsciiCV, BuffCV, ListCV, cvToString, stringAsciiCV, uintCV, principalCV, buffCV, listCV } from "@stacks/transactions";

const ERR_NOT_AUTHORIZED = 100;
const ERR_CONSULTATION_CLOSED = 101;
const ERR_ALREADY_SUBMITTED = 102;
const ERR_INVALID_INPUT = 103;
const ERR_NOT_FOUND = 104;
const ERR_INVALID_DEADLINE = 105;
const ERR_INVALID_TOPIC = 106;
const ERR_INVALID_DESCRIPTION = 107;
const ERR_VOTE_ALREADY_CAST = 109;
const ERR_INVALID_VOTE = 110;
const ERR_NOT_ELIGIBLE_TO_VOTE = 111;
const ERR_INVALID_SUBMISSION_HASH = 116;
const ERR_DUPLICATE_HASH = 117;
const ERR_INVALID_CATEGORY_TAGS = 118;
const ERR_MAX_SUBMISSIONS_EXCEEDED = 119;
const ERR_INVALID_UPDATE_PARAM = 120;
const ERR_CONSULTATION_NOT_ACTIVE = 108;

interface Submission {
  inputHash: Uint8Array;
  categoryTags: string[];
  timestamp: number;
  voteCount: number;
  qualityScore: number;
}

interface ConsultationDetails {
  id: number;
  creator: string;
  topic: string;
  description: string;
  deadline: number;
  isActive: boolean;
  rewardPool: number;
  submissionCount: number;
}

type Result<T, E> = { ok: true; value: T } | { ok: false; value: E };

class ConsultationCoreMock {
  state: {
    consultationId: number;
    creator: string;
    topic: string;
    description: string;
    deadline: number;
    isActive: boolean;
    rewardPool: number;
    submissionCount: number;
    maxSubmissions: number;
    submissions: Map<string, Submission>;
    submissionHashes: Set<string>;
    votes: Map<string, number>;
    diversityMetrics: Map<string, number>;
  } = {
    consultationId: 0,
    creator: "ST1TEST",
    topic: "",
    description: "",
    deadline: 0,
    isActive: false,
    rewardPool: 0,
    submissionCount: 0,
    maxSubmissions: 1000,
    submissions: new Map(),
    submissionHashes: new Set(),
    votes: new Map(),
    diversityMetrics: new Map(),
  };
  blockHeight: number = 0;
  caller: string = "ST1TEST";

  constructor() {
    this.reset();
  }

  reset() {
    this.state = {
      consultationId: 0,
      creator: "ST1TEST",
      topic: "",
      description: "",
      deadline: 0,
      isActive: false,
      rewardPool: 0,
      submissionCount: 0,
      maxSubmissions: 1000,
      submissions: new Map(),
      submissionHashes: new Set(),
      votes: new Map(),
      diversityMetrics: new Map(),
    };
    this.blockHeight = 0;
    this.caller = "ST1TEST";
  }

  initializeConsultation(id: number, newTopic: string, newDescription: string, newDeadline: number, newRewardPool: number): Result<boolean, number> {
    if (this.caller !== this.state.creator) return { ok: false, value: ERR_NOT_AUTHORIZED };
    if (this.state.isActive) return { ok: false, value: ERR_CONSULTATION_NOT_ACTIVE };
    if (!newTopic || newTopic.length > 200) return { ok: false, value: ERR_INVALID_TOPIC };
    if (!newDescription || newDescription.length > 1000) return { ok: false, value: ERR_INVALID_DESCRIPTION };
    if (newDeadline <= this.blockHeight) return { ok: false, value: ERR_INVALID_DEADLINE };
    if (newRewardPool <= 0) return { ok: false, value: ERR_INVALID_UPDATE_PARAM };
    this.state.consultationId = id;
    this.state.topic = newTopic;
    this.state.description = newDescription;
    this.state.deadline = newDeadline;
    this.state.rewardPool = newRewardPool;
    this.state.isActive = true;
    this.state.submissionCount = 0;
    return { ok: true, value: true };
  }

  submitInput(inputHash: Uint8Array, categoryTags: string[]): Result<boolean, number> {
    const user = this.caller;
    const currentTime = this.blockHeight;
    if (!this.state.isActive) return { ok: false, value: ERR_CONSULTATION_CLOSED };
    if (currentTime >= this.state.deadline) return { ok: false, value: ERR_CONSULTATION_CLOSED };
    if (this.state.submissions.has(user)) return { ok: false, value: ERR_ALREADY_SUBMITTED };
    if (inputHash.length !== 32) return { ok: false, value: ERR_INVALID_SUBMISSION_HASH };
    if (categoryTags.length > 5 || !categoryTags.every(tag => tag.length > 0 && tag.length <= 50)) return { ok: false, value: ERR_INVALID_CATEGORY_TAGS };
    const hashStr = inputHash.toString();
    if (this.state.submissionHashes.has(hashStr)) return { ok: false, value: ERR_DUPLICATE_HASH };
    if (this.state.submissionCount >= this.state.maxSubmissions) return { ok: false, value: ERR_MAX_SUBMISSIONS_EXCEEDED };
    this.state.submissions.set(user, { inputHash, categoryTags, timestamp: currentTime, voteCount: 0, qualityScore: 0 });
    this.state.submissionHashes.add(hashStr);
    categoryTags.forEach(tag => {
      const current = this.state.diversityMetrics.get(tag) || 0;
      this.state.diversityMetrics.set(tag, current + 1);
    });
    this.state.submissionCount++;
    return { ok: true, value: true };
  }

  castVote(submissionUser: string, vote: number): Result<boolean, number> {
    const voter = this.caller;
    const currentTime = this.blockHeight;
    if (!this.state.isActive) return { ok: false, value: ERR_CONSULTATION_CLOSED };
    if (currentTime >= this.state.deadline) return { ok: false, value: ERR_CONSULTATION_CLOSED };
    if (!this.state.submissions.has(submissionUser)) return { ok: false, value: ERR_NOT_FOUND };
    if (voter === submissionUser) return { ok: false, value: ERR_NOT_ELIGIBLE_TO_VOTE };
    const voteKey = `${submissionUser}-${voter}`;
    if (this.state.votes.has(voteKey)) return { ok: false, value: ERR_VOTE_ALREADY_CAST };
    if (vote < 1 || vote > 5) return { ok: false, value: ERR_INVALID_VOTE };
    const sub = this.state.submissions.get(submissionUser)!;
    sub.voteCount++;
    sub.qualityScore += vote;
    this.state.submissions.set(submissionUser, sub);
    this.state.votes.set(voteKey, vote);
    return { ok: true, value: true };
  }

  closeConsultation(): Result<boolean, number> {
    if (this.caller !== this.state.creator) return { ok: false, value: ERR_NOT_AUTHORIZED };
    if (!this.state.isActive) return { ok: false, value: ERR_CONSULTATION_NOT_ACTIVE };
    this.state.isActive = false;
    return { ok: true, value: true };
  }

  updateRewardPool(newPool: number): Result<boolean, number> {
    if (this.caller !== this.state.creator) return { ok: false, value: ERR_NOT_AUTHORIZED };
    if (!this.state.isActive) return { ok: false, value: ERR_CONSULTATION_CLOSED };
    if (newPool <= this.state.rewardPool) return { ok: false, value: ERR_INVALID_UPDATE_PARAM };
    this.state.rewardPool = newPool;
    return { ok: true, value: true };
  }

  getConsultationDetails(): Result<ConsultationDetails, number> {
    return { ok: true, value: {
      id: this.state.consultationId,
      creator: this.state.creator,
      topic: this.state.topic,
      description: this.state.description,
      deadline: this.state.deadline,
      isActive: this.state.isActive,
      rewardPool: this.state.rewardPool,
      submissionCount: this.state.submissionCount
    } };
  }

  getSubmission(user: string): Result<Submission | null, number> {
    return { ok: true, value: this.state.submissions.get(user) || null };
  }

  getVote(submissionUser: string, voter: string): Result<number, number> {
    const voteKey = `${submissionUser}-${voter}`;
    return { ok: true, value: this.state.votes.get(voteKey) || 0 };
  }

  getDiversityMetric(tag: string): Result<number, number> {
    return { ok: true, value: this.state.diversityMetrics.get(tag) || 0 };
  }
}

describe("ConsultationCore", () => {
  let contract: ConsultationCoreMock;

  beforeEach(() => {
    contract = new ConsultationCoreMock();
    contract.reset();
  });

  it("initializes consultation successfully", () => {
    const result = contract.initializeConsultation(1, "Test Topic", "Test Description", 100, 500);
    expect(result.ok).toBe(true);
    const details = contract.getConsultationDetails().value;
    expect(details.id).toBe(1);
    expect(details.topic).toBe("Test Topic");
    expect(details.description).toBe("Test Description");
    expect(details.deadline).toBe(100);
    expect(details.rewardPool).toBe(500);
    expect(details.isActive).toBe(true);
  });

  it("rejects initialization if already active", () => {
    contract.initializeConsultation(1, "Test", "Desc", 100, 500);
    const result = contract.initializeConsultation(2, "Test2", "Desc2", 200, 1000);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_CONSULTATION_NOT_ACTIVE);
  });

  it("submits input successfully", () => {
    contract.initializeConsultation(1, "Topic", "Desc", 100, 500);
    const inputHash = new Uint8Array(32).fill(1);
    const tags = ["region:EU", "expertise:tech"];
    const result = contract.submitInput(inputHash, tags);
    expect(result.ok).toBe(true);
    const sub = contract.getSubmission("ST1TEST").value;
    expect(sub?.inputHash).toEqual(inputHash);
    expect(sub?.categoryTags).toEqual(tags);
    expect(sub?.voteCount).toBe(0);
    expect(sub?.qualityScore).toBe(0);
    expect(contract.getDiversityMetric("region:EU").value).toBe(1);
    expect(contract.getDiversityMetric("expertise:tech").value).toBe(1);
  });

  it("rejects submission after deadline", () => {
    contract.initializeConsultation(1, "Topic", "Desc", 100, 500);
    contract.blockHeight = 101;
    const inputHash = new Uint8Array(32).fill(1);
    const result = contract.submitInput(inputHash, []);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_CONSULTATION_CLOSED);
  });

  it("casts vote successfully", () => {
    contract.initializeConsultation(1, "Topic", "Desc", 100, 500);
    const inputHash = new Uint8Array(32).fill(1);
    contract.submitInput(inputHash, []);
    contract.caller = "ST2VOTER";
    const result = contract.castVote("ST1TEST", 3);
    expect(result.ok).toBe(true);
    const sub = contract.getSubmission("ST1TEST").value;
    expect(sub?.voteCount).toBe(1);
    expect(sub?.qualityScore).toBe(3);
    expect(contract.getVote("ST1TEST", "ST2VOTER").value).toBe(3);
  });

  it("rejects self-vote", () => {
    contract.initializeConsultation(1, "Topic", "Desc", 100, 500);
    const inputHash = new Uint8Array(32).fill(1);
    contract.submitInput(inputHash, []);
    const result = contract.castVote("ST1TEST", 3);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_NOT_ELIGIBLE_TO_VOTE);
  });

  it("closes consultation successfully", () => {
    contract.initializeConsultation(1, "Topic", "Desc", 100, 500);
    const result = contract.closeConsultation();
    expect(result.ok).toBe(true);
    expect(contract.getConsultationDetails().value.isActive).toBe(false);
  });

  it("rejects close by non-creator", () => {
    contract.initializeConsultation(1, "Topic", "Desc", 100, 500);
    contract.caller = "ST2FAKE";
    const result = contract.closeConsultation();
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_NOT_AUTHORIZED);
  });

  it("updates reward pool successfully", () => {
    contract.initializeConsultation(1, "Topic", "Desc", 100, 500);
    const result = contract.updateRewardPool(1000);
    expect(result.ok).toBe(true);
    expect(contract.getConsultationDetails().value.rewardPool).toBe(1000);
  });

  it("rejects invalid reward pool update", () => {
    contract.initializeConsultation(1, "Topic", "Desc", 100, 500);
    const result = contract.updateRewardPool(400);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_UPDATE_PARAM);
  });

  it("rejects duplicate submission hash", () => {
    contract.initializeConsultation(1, "Topic", "Desc", 100, 500);
    const inputHash = new Uint8Array(32).fill(1);
    contract.submitInput(inputHash, []);
    contract.caller = "ST2OTHER";
    const result = contract.submitInput(inputHash, []);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_DUPLICATE_HASH);
  });

  it("rejects submission with invalid hash length", () => {
    contract.initializeConsultation(1, "Topic", "Desc", 100, 500);
    const inputHash = new Uint8Array(31).fill(1);
    const result = contract.submitInput(inputHash, []);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_SUBMISSION_HASH);
  });

  it("rejects submission with too many tags", () => {
    contract.initializeConsultation(1, "Topic", "Desc", 100, 500);
    const inputHash = new Uint8Array(32).fill(1);
    const tags = Array(6).fill("tag");
    const result = contract.submitInput(inputHash, tags);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_CATEGORY_TAGS);
  });

  it("rejects vote with invalid value", () => {
    contract.initializeConsultation(1, "Topic", "Desc", 100, 500);
    const inputHash = new Uint8Array(32).fill(1);
    contract.submitInput(inputHash, []);
    contract.caller = "ST2VOTER";
    const result = contract.castVote("ST1TEST", 6);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_VOTE);
  });
});