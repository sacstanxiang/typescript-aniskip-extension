import React from 'react';
import ReactDOM from 'react-dom';
import { browser } from 'webextension-polyfill-ts';

import { Player, Metadata } from '../types/players/player_types';
import { SkipTime } from '../types/api/skip_time_types';
import isInInterval from '../utils/time_utils';
import SkipButton from '../components/SkipButton';
import SkipTimeIndicatorsRenderer from '../renderers/skip_time_indicators_renderer';
import SubmitMenuButtonRenderer from '../renderers/submit_menu_button_renderer';
import SubmitMenuRenderer from '../renderers/submit_menu_renderer';

abstract class BasePlayer implements Player {
  document: Document;

  metadata: Metadata;

  isSubmitMenuHidden: boolean;

  submitMenuRenderer: SubmitMenuRenderer;

  submitMenuButtonRenderer: SubmitMenuButtonRenderer;

  skipButtonContainer: HTMLDivElement;

  skipTimeIndicatorRenderer: SkipTimeIndicatorsRenderer;

  videoElement: HTMLVideoElement;

  timeUpdateEventListeners: Record<string, (event: Event) => void>;

  constructor(
    document: Document,
    videoElement: HTMLVideoElement,
    metadata: Metadata
  ) {
    this.document = document;
    this.metadata = metadata;
    this.skipButtonContainer = this.createContainer(
      'aniskip-player-skip-button',
      ['keydown', 'keyup', 'mousedown', 'mouseup', 'click']
    );
    this.videoElement = videoElement;
    this.timeUpdateEventListeners = {};
    this.isSubmitMenuHidden = true;

    this.submitMenuRenderer = new SubmitMenuRenderer(
      'aniskip-player-submit-menu',
      this.metadata.variant,
      () => this.setIsSubmitMenuHidden(true),
      () => this.setIsSubmitMenuHidden(true)
    );
    this.submitMenuButtonRenderer = new SubmitMenuButtonRenderer(
      'aniskip-player-submit-menu-button',
      this.metadata.variant,
      () => this.setIsSubmitMenuHidden(!this.isSubmitMenuHidden)
    );
    this.skipTimeIndicatorRenderer = new SkipTimeIndicatorsRenderer(
      'aniskip-player-skip-time-indicator',
      this.metadata.variant
    );
  }

  addPreviewSkipTime(skipTime: SkipTime) {
    this.clearVideoElementEventListeners(
      Object.values(this.timeUpdateEventListeners)
    );

    const previewSkipHandler = (event: Event) => {
      const margin = 0;
      const video = event.currentTarget as HTMLVideoElement;
      const checkIntervalLength = 5;
      const { interval, episode_length: episodeLength } = skipTime;
      const { start_time: startTime, end_time: endTime } = interval;
      const offset = video.duration - episodeLength;
      const { currentTime } = video;
      const inInterval = isInInterval(
        startTime,
        currentTime,
        margin,
        checkIntervalLength
      );

      if (inInterval) {
        this.setCurrentTime(endTime + offset + margin);
        video.removeEventListener('timeupdate', previewSkipHandler);
        Object.values(this.timeUpdateEventListeners).forEach(
          (functionReference) => {
            this.videoElement.addEventListener('timeupdate', functionReference);
          }
        );
      }
    };
    this.videoElement.addEventListener('timeupdate', previewSkipHandler);

    const margin = 2;
    const newTime = skipTime.interval.start_time - margin;
    this.videoElement.currentTime = newTime > 0 ? newTime : 0;
    this.videoElement.play();
  }

  addSkipTime(skipTime: SkipTime, manual: boolean = false) {
    this.skipTimeIndicatorRenderer.addSkipTimeIndicator(skipTime);
    this.videoElement.addEventListener(
      'timeupdate',
      this.skipIfInInterval(skipTime, manual)
    );
  }

  /**
   * Removes skip times event handlers from the video element
   * @param eventListeners Event listeners to remove
   */
  clearVideoElementEventListeners(eventListeners: EventListener[]) {
    eventListeners.forEach((listener) =>
      this.videoElement.removeEventListener('timeupdate', listener)
    );
  }

  /**
   * Returns a new div container with a shadow root initialised
   * @param id Id of the newly created container
   * @param stopPropagationEvents Events to stop propagation of
   */
  createContainer(id: string, stopPropagationEvents: string[] = []) {
    const container = this.document.createElement('div');
    container.setAttribute('id', id);
    container.attachShadow({ mode: 'open' });

    stopPropagationEvents.forEach((eventName) => {
      container.addEventListener(eventName, (event) => {
        event.stopPropagation();
      });
    });

    (async () => {
      const cssUrl = browser.runtime.getURL('player_script.css');
      const response = await fetch(cssUrl, { method: 'GET' });
      const cssString = await response.text();
      const style = document.createElement('style');
      style.innerHTML = cssString;
      container.shadowRoot?.appendChild(style);
    })();

    return container;
  }

  /**
   * Returns the container element with the given query string
   * @param selectorString Selector string to retrieve the node
   * @param index Index of the container from the query result
   */
  getContainerHelper(
    selectorString: string,
    index: number = 0
  ): HTMLElement | null {
    const containers = this.document.getElementsByClassName(selectorString);
    return containers[index] as HTMLElement;
  }

  getDuration() {
    return this.videoElement.duration;
  }

  getCurrentTime() {
    return this.videoElement.currentTime;
  }

  /**
   * Returns the root video container element
   */
  getVideoContainer() {
    return this.document.getElementById(
      this.metadata.videoContainerSelectorString
    );
  }

  getVideoControlsContainer() {
    return this.document.getElementById(
      this.metadata.videoControlsContainerSelectorString
    );
  }

  /**
   * Returns the seek bar container element
   */
  getSeekBarContainer() {
    return this.getContainerHelper(
      this.metadata.seekBarContainerSelectorString,
      0
    );
  }

  getSettingsButtonElement() {
    return this.document.getElementById(
      this.metadata.injectSettingsButtonReferenceNodeSelectorString
    );
  }

  initialise() {
    this.videoElement.onloadedmetadata = () => {
      this.reset();
      this.injectSubmitMenu();
      this.injectSubmitMenuButton();
      this.injectSkipTimeIndicator();
      this.injectSkipButton();
      browser.runtime.sendMessage({ type: 'player-ready' });
    };
  }

  /**
   * Injects the skip button into the player
   */
  injectSkipButton() {
    const submitMenuParentElement = this.submitMenuButtonRenderer
      .shadowRootContainer.parentElement;
    const shadowRootContainer = this.skipButtonContainer;
    if (submitMenuParentElement && shadowRootContainer) {
      this.injectContainerHelper(submitMenuParentElement, shadowRootContainer);
    }
  }

  /**
   * Injects the skip time indicators into the player seek bar
   */
  injectSkipTimeIndicator() {
    const seekBarContainer = this.getSeekBarContainer();
    if (seekBarContainer) {
      seekBarContainer.appendChild(
        this.skipTimeIndicatorRenderer.shadowRootContainer
      );
      this.skipTimeIndicatorRenderer.setVideoDuration(this.getDuration());
      this.skipTimeIndicatorRenderer.render();
    }
  }

  /**
   * Helper function to inject containers into the player
   * @param target Div element to put the shadow root element into
   * @param shadowRootContainer Container element which contains the shadow root
   * @param reactRootId If specified, a div element is created for the react root
   */
  injectContainerHelper(
    target: HTMLElement,
    shadowRootContainer: HTMLElement,
    reactRootId?: string
  ): void {
    const { id, shadowRoot } = shadowRootContainer;
    if (this.document.getElementById(id) || !shadowRoot) {
      return;
    }

    if (reactRootId && !shadowRoot.getElementById(reactRootId)) {
      const root = this.document.createElement('div');
      root.setAttribute('id', reactRootId);
      shadowRoot.appendChild(root);
    }

    target.appendChild(shadowRootContainer);
  }

  /**
   * Injects the submit menu button into the player controls
   */
  injectSubmitMenu() {
    const videoContainer = this.getVideoContainer();
    if (videoContainer) {
      videoContainer.appendChild(this.submitMenuRenderer.shadowRootContainer);
      this.submitMenuRenderer.render();
    }
  }

  /**
   * Injects the submit menu button into the player
   */
  injectSubmitMenuButton() {
    const settingsButtonElement = this.getSettingsButtonElement();
    if (settingsButtonElement) {
      settingsButtonElement.insertAdjacentElement(
        'beforebegin',
        this.submitMenuButtonRenderer.shadowRootContainer
      );
      this.submitMenuButtonRenderer.render();
    }
  }

  play() {
    this.videoElement.play();
  }

  reset() {
    this.skipTimeIndicatorRenderer.clearSkipTimeIndicators();
    this.clearVideoElementEventListeners(
      Object.values(this.timeUpdateEventListeners)
    );
    this.timeUpdateEventListeners = {};
  }

  /**
   * Sets the video element current time to the input time
   * @param time Time in seconds to set the player time to
   */
  setCurrentTime(time: number) {
    this.videoElement.currentTime = time;
  }

  /**
   * Set is submit menu hidden field
   * @param isSubmitMenuHidden Is submit menu hidden new value
   */
  setIsSubmitMenuHidden(isSubmitMenuHidden: boolean) {
    this.isSubmitMenuHidden = isSubmitMenuHidden;
    this.submitMenuButtonRenderer.setIsActive(!this.isSubmitMenuHidden);
    this.submitMenuRenderer.setIsHidden(this.isSubmitMenuHidden);
  }

  /**
   * Skips the time in the interval if it is within the interval range
   * @param skipTime Skip time object containing the intervals
   */
  skipIfInInterval(skipTime: SkipTime, manual: boolean) {
    const skipTimeString = JSON.stringify(skipTime);
    // Ensures player event handlers can be removed
    const timeUpdateEventListener =
      this.timeUpdateEventListeners[skipTimeString] ||
      (this.timeUpdateEventListeners[skipTimeString] = (event: Event) => {
        const margin = 0;
        const video = event.currentTarget as HTMLVideoElement;
        const { interval, episode_length: episodeLength } = skipTime;
        const { start_time: startTime, end_time: endTime } = interval;
        const skipTimeIntervalLength = endTime - startTime;
        const checkIntervalLength = manual ? skipTimeIntervalLength : 1;
        const offset = video.duration - episodeLength;
        const { currentTime } = video;
        const inInterval = isInInterval(
          startTime + offset,
          currentTime,
          margin,
          checkIntervalLength
        );

        if (manual) {
          const { id, shadowRoot } = this.skipButtonContainer;
          if (!shadowRoot) {
            return;
          }

          const reactRootId = `${id}-${skipTime.skip_type}-root`;
          if (!shadowRoot.getElementById(reactRootId)) {
            const root = this.document.createElement('div');
            root.setAttribute('id', reactRootId);
            shadowRoot.appendChild(root);
          }

          const reactRoot = shadowRoot.getElementById(reactRootId);
          if (!reactRoot) {
            return;
          }

          ReactDOM.render(
            <SkipButton
              skipType={skipTime.skip_type}
              variant={this.metadata.variant}
              hidden={!inInterval}
              onClick={() => {
                this.setCurrentTime(endTime + offset + margin);
                this.play();
              }}
            />,
            reactRoot
          );
        } else if (inInterval) {
          this.setCurrentTime(endTime + offset + margin);
        }
      });

    return timeUpdateEventListener;
  }
}

export default BasePlayer;
