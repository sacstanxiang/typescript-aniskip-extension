export interface SkipTime {
  interval: {
    start_time: number;
    end_time: number;
  };
  skip_type: 'op' | 'ed';
  skip_id: string;
  episode_length: number;
}

export type GetResponseTypeFromSkipTimes =
  | {
      found: false;
    }
  | {
      found: true;
      result: SkipTime;
    };

export interface SuccessMessageType {
  message: 'success';
}

export type PostResponseTypeFromSkipTimesVote = SuccessMessageType;
export type PostResponseTypeFromSkipTimes = SuccessMessageType;