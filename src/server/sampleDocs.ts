export interface SampleDocDefinition {
  id: string;
  title: string;
  fileName: string;
  fileType: 'pdf' | 'docx' | 'txt';
  category: string;
  description: string;
  text: string;
}

export const SAMPLE_DOCUMENTS: SampleDocDefinition[] = [
  {
    id: 'sample-async-fifo-cdc',
    title: 'Asynchronous FIFO & Clock Domain Crossing (CDC) Architecture Specification',
    fileName: 'Asynchronous_FIFO_CDC_Spec_v2.4.pdf',
    fileType: 'pdf',
    category: 'Digital VLSI Design',
    description: 'Hardware specification for dual-clock asynchronous FIFO with Gray-code pointers, 2-stage synchronizers, and MTBF analysis.',
    text: `--- PAGE 1 ---
# Specification Document: Dual-Clock Asynchronous FIFO & CDC Controller
**Document ID:** SPEC-CDC-FIFO-0891
**Revision:** 2.4.0
**Author:** VLSI Hardware Systems Architecture Group
**Classification:** Technical Standard

## 1. Executive Summary & Design Purpose
The primary purpose of this design is to safely transfer high-bandwidth 32-bit streaming data words between two independent, mutually asynchronous clock domains: the Write Clock Domain (wclk, nominally 250 MHz) and the Read Clock Domain (rclk, nominally 133.3 MHz). 
Without asynchronous FIFO isolation, direct signal sampling across clock domain boundaries inevitably causes flip-flop metastability, resulting in unpredictable logic states, data corruption, and catastrophic system bus lockup.

Key architectural objectives:
- Zero data loss under continuous backpressure.
- Constant single-cycle latency for write assertions when not full.
- Guaranteed Mean Time Between Failures (MTBF) exceeding 10,000 years under 16nm FinFET process nodes.
- Full cycle-accurate empty and full detection using 2-stage Gray code synchronizers.

--- PAGE 2 ---
## 2. FIFO Storage Matrix & Physical Specifications
The FIFO storage array is implemented using dual-port static RAM (DP-SRAM) configured as a circular ring buffer.

### 2.1 Technical Specifications Table
| Parameter | Specification | Tolerance / Constraint |
| :--- | :--- | :--- |
| FIFO Buffer Depth | 16 words (expandable to 64) | Power of 2 required |
| Data Bus Width | 32 bits (wdata[31:0], rdata[31:0]) | Little-endian |
| Write Clock (wclk) Max Frequency | 300 MHz (Nominal: 250 MHz) | Duty cycle 50% ± 5% |
| Read Clock (rclk) Max Frequency | 200 MHz (Nominal: 133.3 MHz) | Duty cycle 50% ± 5% |
| Synchronization Depth | 2-stage Flip-Flop Synchronizer | Standard DFF with high gain-bandwidth |
| Metastability MTBF | > 1.2 × 10^5 years at 250 MHz | 16nm standard library cells |
| Storage Array Type | True Dual-Port Register Matrix | Independent wclk and rclk ports |
| Write Latency | 1 wclk cycle | Registered into memory array |
| Read Latency | 1 rclk cycle | Registered from memory output |

--- PAGE 3 ---
## 3. FIFO Architecture & Internal Functional Blocks
The asynchronous FIFO consists of five principal functional modules:
1. **FIFO Memory Matrix (fifo_mem):** 16-word deep dual-port memory accessed via write address (waddr[3:0]) and read address (raddr[3:0]).
2. **Write Pointer & Full Logic (wptr_full):** Increments binary write pointer, converts binary pointer to Gray-code (wptr[4:0]), and compares local wptr with synchronized read pointer (wq2_rptr) to assert wfull.
3. **Read Pointer & Empty Logic (rptr_empty):** Increments binary read pointer, converts binary pointer to Gray-code (rptr[4:0]), and compares local rptr with synchronized write pointer (rq2_wptr) to assert rempty.
4. **Read-to-Write Synchronizer (sync_r2w):** Two cascading wclk flip-flops that register the Gray-coded read pointer into the write domain.
5. **Write-to-Read Synchronizer (sync_w2r):** Two cascading rclk flip-flops that register the Gray-coded write pointer into the read domain.

--- PAGE 4 ---
## 4. Clock Domain Crossing (CDC) & Gray Code Synchronization
### 4.1 The Metastability Problem
When a multi-bit binary counter passes between asynchronous clock domains, multiple bits can transition simultaneously. Due to differing wire delays and setup/hold tolerances, the receiving clock domain may sample some bits before their transition and other bits after. For example, transition from 3 (0011b) to 4 (0100b) changes 3 bits simultaneously. If sampled midway, the synchronizer may latch 0000b, 0111b, or enter an intermediate metastable state.

### 4.2 Gray Code Invariant
To eliminate multi-bit sampling hazards, the FIFO converts all pointer addresses into Gray code prior to cross-domain transmission. In Gray code, exactly ONE bit changes between any two sequential states.
Binary to Gray conversion formula:
Gray[N:0] = Binary[N:0] ^ (Binary[N:0] >> 1)

Gray to Binary conversion algorithm:
Bin[N] = Gray[N]
Bin[i] = Bin[i+1] ^ Gray[i] (for i = N-1 down to 0)

--- PAGE 5 ---
## 5. Pointer Arithmetic, Full and Empty Detection
An extra MSB bit (bit 4 for depth 16) is added to the pointer to differentiate between the completely full condition and the completely empty condition. Both pointers cycle from 0 to 31 (2 × Depth - 1).

### 5.1 Empty Condition Formula
The FIFO is empty when the read pointer and the synchronized write pointer are completely identical:
rempty = (rptr == rq2_wptr)

### 5.2 Full Condition Formula
The FIFO is full when the write pointer has wrapped around exactly once ahead of the synchronized read pointer. In Gray code representation, the write pointer MSB and 2nd MSB are inverted, while all lower bits remain identical:
wfull = (wptr[4] != wq2_rptr[4]) && 
        (wptr[3] != wq2_rptr[3]) && 
        (wptr[2:0] == wq2_rptr[2:0])

### 5.3 Pessimistic Safety Margin
Because synchronizer flip-flops incur a 2-clock-cycle delay, the synchronized pointer is always slightly delayed relative to real-time. This guarantees the FIFO is "pessimistic":
- An empty flag may remain asserted for 2 rclk cycles after a write occurs, but it will NEVER indicate empty when valid data is unavailable.
- A full flag may remain asserted for 2 wclk cycles after a read occurs, but it will NEVER indicate not-full when the buffer is actually exhausted.

--- PAGE 6 ---
## 6. Metastability & MTBF Calculation
The Mean Time Between Failures for a 2-stage synchronizer is calculated via the classic equation:
MTBF = exp(t_resolve / tau) / (T_0 * f_clock * f_data)

Where:
- t_resolve = Slack time available for settling = t_cycle - t_setup - t_comb = 3.65 ns
- tau = Metastability time constant of flip-flop = 0.082 ns
- T_0 = Asynchronous aperture window parameter = 1.45 × 10^-12 s
- f_clock = Receiving clock frequency = 250 MHz
- f_data = Maximum data transition frequency = 125 MHz

Calculated MTBF result:
MTBF = exp(3.65 / 0.082) / (1.45e-12 * 2.5e8 * 1.25e8)
MTBF = exp(44.51) / 4.53e4 = 2.14 × 10^19 seconds ≈ 6.8 × 10^11 years.

--- PAGE 7 ---
## 7. Known Limitations and Timing Rules
1. Reset Sequencing: Both wrst_n and rrst_n must be de-asserted synchronously to their respective clock domains. Use dedicated reset synchronizer blocks.
2. Minimum Burst Depth: Burst writes cannot exceed 16 consecutive words if rclk is halted or under heavy wait states.
3. Overflow / Underflow Behavior: Write attempts while wfull is high are silently discarded without corrupting existing FIFO cells. Read attempts while rempty is high return stagnant rdata without advancing rptr.
4. Synthesizer Constraints: Never apply clock gating directly onto wq2_rptr or rq2_wptr synchronizer registers. Set set_false_path or set_max_delay constraints across the asynchronous wptr-to-rq1 and rptr-to-wq1 crossings.
`
  },
  {
    id: 'sample-raft-consensus',
    title: 'Raft Distributed Consensus Engine Technical Architecture',
    fileName: 'Raft_Distributed_Consensus_Specification_v1.8.pdf',
    fileType: 'pdf',
    category: 'Distributed Systems',
    description: 'Technical blueprint for replicated state machines, leader election timers, log replication RPCs, and safety invariants.',
    text: `--- PAGE 1 ---
# Raft Consensus Protocol: Production Engine Specification
**Document ID:** DIST-RAFT-CORE-104
**Revision:** 1.8.2
**Domain:** Distributed State Machines & Fault Tolerant Storage

## 1. Purpose and Protocol Goals
The Raft engine implements a fault-tolerant, replicated write-ahead log across a cluster of N nodes. It ensures that regardless of arbitrary network partitions, packet loss, or server crashes (up to (N-1)/2 node failures), all non-faulty nodes execute an identical sequence of state machine transitions in identical order.

Primary design requirements:
- Strong Leadership: Log entries flow in a strictly unidirectional manner from the elected Leader to Follower nodes.
- Quorum-Based Consensus: All state commitments require confirmation from a majority quorum: Q = floor(N / 2) + 1.
- Immediate Split-Brain Resolution: Randomized election timers prevent concurrent split votes.

--- PAGE 2 ---
## 2. Server Roles and State Transitions
At any instant, each cluster replica exists in exactly one of three states:
1. **Leader:** Accepts client write requests, creates new log entries, and replicates them to Followers via AppendEntries RPC. Heartbeats are sent at 50ms intervals.
2. **Follower:** Completely passive; responds to incoming RPCs from Candidates and Leaders. If electionTimeout elapses without receiving a valid heartbeat, transitions to Candidate.
3. **Candidate:** Initiates election rounds by incrementing currentTerm, voting for itself, and broadcasting RequestVote RPCs.

### 2.1 State Transition Invariants
- If an election timer fires: Follower -> Candidate.
- If Candidate receives votes from a majority of nodes: Candidate -> Leader.
- If Candidate or Leader discovers another node with a higher term (T > currentTerm): Transitions immediately to Follower and updates currentTerm = T.

--- PAGE 3 ---
## 3. Log Invariants and Safety Guarantees
Raft guarantees five fundamental safety properties:
1. **Election Safety:** At most one leader can be elected in any given term.
2. **Leader Append-Only:** A leader never overwrites or truncates its own log entries; it only appends new entries.
3. **Log Matching Property:** If two logs contain an entry with the same index and term, then:
   - The logs are identical in that specific entry.
   - The logs are identical in all entries from index 1 through that index.
4. **Leader Completeness:** If a log entry is committed in a given term, that entry will be present in the logs of the leaders for all higher-numbered terms.
5. **State Machine Safety:** If a server has applied a log entry at a given index to its state machine, no other server will ever apply a different log entry for that same index.

--- PAGE 4 ---
## 4. RPC Specifications and Wire Formats
### 4.1 AppendEntries RPC (Invoked by Leader)
Arguments:
- term: Leader's current term
- leaderId: Identifier so follower can redirect clients
- prevLogIndex: Index of log entry immediately preceding new ones
- prevLogTerm: Term of prevLogIndex entry
- entries[]: Log entries to store (empty for heartbeat keep-alive)
- leaderCommit: Leader's commitIndex

Results:
- term: currentTerm, for leader to update itself
- success: true if follower contained entry matching prevLogIndex and prevLogTerm

### 4.2 RequestVote RPC (Invoked by Candidate)
Arguments:
- term: Candidate's current term
- candidateId: Candidate requesting vote
- lastLogIndex: Index of candidate's last log entry
- lastLogTerm: Term of candidate's last log entry

Vote Restriction Rule: Receiver denies vote if candidate's log is less up-to-date than receiver's own log. Up-to-date comparison:
If logs have different terms in last entries, the entry with the higher term is more up-to-date. If last entries have the same term, the longer log is more up-to-date.

--- PAGE 5 ---
## 5. Timing Parameters and Tuning Specifications
- Broadcast Time (t_broadcast): 0.5 ms to 20 ms (network round-trip time between cluster nodes).
- Heartbeat Interval: 50 ms.
- Election Timeout Range: 150 ms to 300 ms (randomized uniformly per node on reset).
- Disk fsync Latency: 1.2 ms on NVMe SSD storage.
Formula constraint:
t_broadcast << ElectionTimeout << MTBF_hardware
`
  },
  {
    id: 'sample-riscv-core',
    title: 'RISC-V RV32I 5-Stage Pipelined Processor Core Technical Manual',
    fileName: 'RV32I_5Stage_Pipelined_Microarchitecture_Manual.docx',
    fileType: 'docx',
    category: 'Computer Architecture',
    description: 'Hardware microarchitecture manual covering 5-stage pipeline, data forwarding unit, hazard detection, and branch resolution.',
    text: `--- PAGE 1 ---
# RV32I Microarchitecture Manual: 5-Stage In-Order Pipelined Core
**Architecture Version:** RV32I User-Level ISA 2.2
**Core Codename:** PHOENIX-32
**Execution Model:** 5-Stage In-Order Single-Issue RISC Pipeline

## 1. Architectural Overview
The PHOENIX-32 core implements the baseline integer 32-bit RISC-V specification (RV32I) containing 32 general-purpose registers (x0 to x31, with x0 hardwired to zero) and a 32-bit program counter (PC).

The pipeline is partitioned into five distinct synchronous clock cycles:
1. **IF (Instruction Fetch):** Queries 32-bit instruction from L1 Instruction Cache or memory based on current PC.
2. **ID (Instruction Decode / Register Read):** Decodes opcode, generates immediate operand, and reads registers rs1 and rs2.
3. **EX (Execute / ALU):** Executes arithmetic/logic operations, calculates memory effective addresses, and evaluates branch conditions.
4. **MEM (Memory Access):** Reads from or writes to 32-bit byte-addressable L1 Data Cache for LOAD and STORE instructions.
5. **WB (Writeback):** Writes ALU result or loaded memory data back to the destination register rd.

--- PAGE 2 ---
## 2. Pipeline Registers and State Boundaries
Between each pipeline stage, dedicated pipeline registers isolate signals across clock edges:
- **IF/ID Register:** Holds 32-bit instruction, PC, and PC+4.
- **ID/EX Register:** Holds control vectors (ALUOp, ALUSrc, RegWrite, MemRead, MemWrite, Branch), rs1_data, rs2_data, 32-bit sign-extended immediate, rs1_addr, rs2_addr, and rd_addr.
- **EX/MEM Register:** Holds ALU_result, write_data (rs2 value), rd_addr, Zero_flag, and memory control signals.
- **MEM/WB Register:** Holds Read_data from memory, ALU_result, rd_addr, and RegWrite control bit.

--- PAGE 3 ---
## 3. Pipeline Hazards & Resolution Mechanisms
Pipeline hazards occur when instructions cannot execute in their designated clock cycles without producing incorrect execution.

### 3.1 Structural Hazards
Avoided by employing independent Harvard architecture L1 caches: dedicated Instruction Cache (I-Cache) and Data Cache (D-Cache), eliminating simultaneous memory contention in IF and MEM stages.

### 3.2 Data Hazards & Forwarding Unit
Data hazards arise when an instruction depends on the result of an earlier instruction still traversing the pipeline.
The Forwarding Unit detects conflicts by comparing EX/MEM.rd and MEM/WB.rd with ID/EX.rs1 and ID/EX.rs2.

Forwarding Conditions:
- ForwardA = 10 (Forward from EX/MEM): 
  if (EX/MEM.RegWrite && (EX/MEM.RegisterRd != 0) && (EX/MEM.RegisterRd == ID/EX.RegisterRs1))
- ForwardA = 01 (Forward from MEM/WB):
  if (MEM/WB.RegWrite && (MEM/WB.RegisterRd != 0) && !(EX/MEM.RegWrite && (EX/MEM.RegisterRd != 0) && (EX/MEM.RegisterRd == ID/EX.RegisterRs1)) && (MEM/WB.RegisterRd == ID/EX.RegisterRs1))

### 3.3 Load-Use Data Hazard & Pipeline Stall
When an instruction immediately following a LW depends on the loaded value, data is not available until the end of the MEM stage. Forwarding alone cannot bridge this gap.
Detection rule:
if (ID/EX.MemRead && ((ID/EX.RegisterRd == IF/ID.RegisterRs1) || (ID/EX.RegisterRd == IF/ID.RegisterRs2)))
Action: 
1. Stall IF and ID stages (keep PC and IF/ID registers unchanged).
2. Insert a bubble (NOP / clear control signals) into the ID/EX register.

--- PAGE 4 ---
## 4. Control Hazards and Branch Prediction
Conditional branches (BEQ, BNE, BLT, BGE, BLTU, BGEU) determine target PC in the EX stage.
Without prediction, a 2-cycle penalty occurs on every branch.
The PHOENIX-32 core utilizes a Dynamic 2-bit Saturating Counter Branch History Table (BHT):
- States: Strongly Not Taken (00), Weakly Not Taken (01), Weakly Taken (10), Strongly Taken (11).
- Misprediction Penalty: 2 cycles. When a misprediction is detected in EX, the IF/ID and ID/EX registers are flushed (cleared to NOPs), and the PC is corrected to the computed branch target.

--- PAGE 5 ---
## 5. Performance and Clock Specifications
- Maximum Clock Frequency: 450 MHz on TSMC 28nm HPM.
- Peak Throughput: 1.0 Instructions Per Cycle (IPC) with zero stalls.
- Average CPI on Dhrystone 2.1 benchmark: 1.28 CPI.
- Power Consumption: 14.8 mW at 400 MHz (0.9V core VDD).
`
  }
];
