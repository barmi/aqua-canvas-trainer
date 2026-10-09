import type { GuideDefinition } from '../../domain/guide'
import type { ReadyScene } from '../../domain/scene'

export interface ExampleOptions {
  /** Paint opaque paper and the scene's base wash under the tints. Off for the tracing layer. */
  paper: boolean
  /** Draw the line art on top. Off for the tracing layer, which sits under the real line art. */
  lineArt: boolean
}

/**
 * Composites the example painting from the scene's masks and the guide's per-step tints,
 * including steps 0..uptoStepIndex (inclusive). uptoStepIndex = steps.length - 1 is the finished example.
 * Returns a canvas of the scene's logical size; mask and art images are cached by URL.
 */
export async function renderExample(scene: ReadyScene, guide: GuideDefinition, uptoStepIndex: number, options: ExampleOptions = { paper: true, lineArt: true }): Promise<HTMLCanvasElement> {
  void scene; void guide; void uptoStepIndex; void options
  throw new Error('renderExample is implemented in the content/composite work item')
}
