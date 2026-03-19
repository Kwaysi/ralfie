// -- PRD & Item types --

export type ItemStatus = 'pending' | 'in_progress' | 'done' | 'failed' | 'verified';

export interface PrdItemComment {
  timestamp: string;
  session_id: string;
  message: string;
}

export interface PrdItem {
  id: string;
  category: string;
  user_story?: string;
  description: string;
  end_state?: string;
  steps_to_verify: string[];
  status: ItemStatus;
  assigned_to: string | null;
  started_at: string | null;
  completed_at: string | null;
  comments: PrdItemComment[];
}

export interface Prd {
  project: string;
  description: string;
  items: PrdItem[];
}

// -- Board types --

export interface BoardMeta {
  name: string;
  created_at: string;
  description: string;
}

export interface Board {
  meta: BoardMeta;
  plan: string;
  prd: Prd;
  progress: string;
}

export interface BoardWithStatus extends Board {
  activeRuns: number;
}

// -- Config --

export type EffortLevel = 'low' | 'medium' | 'high';
export type AgentModel = 'opus' | 'sonnet' | 'haiku';

export interface RalfieConfig {
  agent_command: string;
  default_iterations: number;
  feedback_loops: string[];
  serve_port: number;
  effort: EffortLevel;
  model: AgentModel;
  user: string;
  serve_pid: number | null;
}

// -- WebSocket events --

export type WsEventType =
  | 'board:updated'
  | 'prd:updated'
  | 'progress:updated'
  | 'lock:acquired'
  | 'lock:released'
  | 'run:started'
  | 'run:iteration'
  | 'run:completed'
  | 'run:stopped';

export interface WsEvent {
  type: WsEventType;
  board: string;
  data: unknown;
  timestamp: string;
}
