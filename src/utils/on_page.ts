import Aniwatch from '../pages/aniwatch/page';
import Gogoanime from '../pages/gogoanime/page';
import Nineanime from '../pages/nineanime/page';
import { SkipTime } from '../types/api/skip_time_types';
import Page from '../types/pages/page_type';

/** Skips time on player based on skip intervals padded with margin
 * @param player Selector for media player with access to .currentTime and .duration
 * @param skipTime JSON object of SkipTimes type with information about skip times
 * @param margin Duration of padding to compensate for lack of skip time sensitivity
 * @returns Reference to skip interval if play
 */
export function skipInterval(
  player: HTMLVideoElement,
  skipTime: SkipTime,
  margin: number
): void {
  const currentTotalLength = player.duration;
  const skipDiff = currentTotalLength - skipTime.episode_length;
  const startTime = skipTime.interval.start_time;
  const endTime = skipTime.interval.end_time;
  if (startTime > margin) {
    if (
      player.currentTime >= startTime + skipDiff + margin &&
      player.currentTime <= endTime + skipDiff - margin
    ) {
      // eslint-disable-next-line no-param-reassign
      player.currentTime = endTime + skipDiff + margin;
    }
  } else if (
    player.currentTime >= 0 &&
    player.currentTime <= endTime + skipDiff - margin
  ) {
    // eslint-disable-next-line no-param-reassign
    player.currentTime = endTime + skipDiff - margin;
  }
}

/**  Get provider name, provider anime id and anime episode number from current url
 * @returns A tuple of (providerName, identifier and episodeNumber)
 */
export function getProviderInformation(pathname: string, hostname: string) {
  const domainName = hostname.replace(/(?:[^.\n]*\.)?([^.\n]*)(\..*)/, '$1');
  let page: Page;

  switch (domainName) {
    case 'aniwatch':
      page = new Aniwatch(hostname, pathname);
      break;
    case 'gogoanime':
      page = new Gogoanime(hostname, pathname);
      break;
    case '9anime':
      page = new Nineanime(hostname, pathname);
      break;
    default:
      throw new Error(`Page ${hostname} not supported`);
  }
  const providerName = page.getProviderName();
  const identifier = page.getIdentifier();
  const episodeNumber = page.getEpisodeNumber();
  const result = {
    providerName,
    identifier,
    episodeNumber,
  };
  console.log({ result });
  return result;
}
