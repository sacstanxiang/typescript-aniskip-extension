import {
  GetResponseFromRules,
  GetResponseFromSkipTimes,
  PostResponseFromSkipTimes,
  PostResponseFromSkipTimesVote,
  SkipType,
  VoteType,
} from './aniskip_http_client.types';
import { BaseHttpClient } from '../base_http_client';
import { AniskipHttpClientError } from './error';

export class AniskipHttpClient extends BaseHttpClient {
  constructor() {
    super(
      process.env.NODE_ENV === 'development'
        ? 'http://localhost:5000/v1'
        : 'https://api.aniskip.com/v1'
    );
  }

  /**
   * Retrieves a skip time for the specified anime episode.
   *
   * @param animeId MAL id to get the skip times of.
   * @param episodeNumber Episode number of the anime to get the skip times of.
   * @param type Type of skip times to get, either 'op' or 'ed'.
   */
  async getSkipTimes(
    animeId: number,
    episodeNumber: number,
    types: SkipType[]
  ): Promise<GetResponseFromSkipTimes> {
    const route = `/skip-times/${animeId}/${episodeNumber}`;
    const params = { types };
    const response = await this.request(route, 'GET', params);

    return response.json<GetResponseFromSkipTimes>();
  }

  /**
   * Gets anime episode number redirection rules.
   *
   * @param animeId MAL id to get the episode number rules of.
   */
  async getRules(animeId: number): Promise<GetResponseFromRules> {
    const route = `/rules/${animeId}`;
    const response = await this.request(route, 'GET');

    return response.json<GetResponseFromRules>();
  }

  /**
   * Creates a skip time for the specified anime episode.
   *
   * @param animeId MAL id to get the skip times of.
   * @param episodeNumber Episode number of the anime to get the skip times of.
   * @param skipType Type of skip times to get, either 'op' or 'ed'.
   * @param providerName Name of the provider.
   * @param startTime Start time of the skip.
   * @param endTime End time of the skip.
   * @param episodeLength Length of the episode.
   * @param submitterId UUID of the submitter.
   */
  async createSkipTimes(
    animeId: number,
    episodeNumber: number,
    skipType: SkipType,
    providerName: string,
    startTime: number,
    endTime: number,
    episodeLength: number,
    submitterId: string
  ): Promise<PostResponseFromSkipTimes> {
    const route = `/skip-times/${animeId}/${episodeNumber}`;
    const body = JSON.stringify({
      skip_type: skipType,
      provider_name: providerName,
      start_time: startTime,
      end_time: endTime,
      episode_length: episodeLength,
      submitter_id: submitterId,
    });

    const response = await this.request(route, 'POST', {}, body);
    const json = response.json<PostResponseFromSkipTimes>();

    if (response.error) {
      switch (response.status) {
        case 429:
          throw new AniskipHttpClientError(
            response.error,
            'skip-times/rate-limited'
          );
        case 400:
          throw new AniskipHttpClientError(
            response.error,
            'skip-times/parameter-error'
          );
        case 500:
        default:
          throw new AniskipHttpClientError(
            'Internal Server Error',
            'skip-times/internal-server-error'
          );
      }
    }

    return json;
  }

  /**
   * Vote on a skip time.
   *
   * @param skipId UUID of the skip time to vote on.
   * @param type Type of voting, either 'upvote' or 'downvote'.
   */
  async vote(
    skipId: string,
    type: VoteType
  ): Promise<PostResponseFromSkipTimesVote> {
    const route = `/skip-times/vote/${skipId}`;
    const body = JSON.stringify({
      vote_type: type,
    });
    const response = await this.request(route, 'POST', {}, body);
    const { json, status } = response;
    if (status === 429) {
      throw new AniskipHttpClientError('Rate limited', 'vote/rate-limited');
    }
    return json<PostResponseFromSkipTimesVote>();
  }

  /**
   * Upvote on a skip time.
   *
   * @param skipId UUID of the skip time to vote on.
   */
  async upvote(skipId: string): Promise<PostResponseFromSkipTimesVote> {
    return this.vote(skipId, 'upvote');
  }

  /**
   * Downvote on a skip time.
   *
   * @param skipId UUID of the skip time to vote on.
   */
  async downvote(skipId: string): Promise<PostResponseFromSkipTimesVote> {
    return this.vote(skipId, 'downvote');
  }
}
