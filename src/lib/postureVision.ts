import {
  FaceLandmarker,
  FilesetResolver,
  PoseLandmarker,
} from '@mediapipe/tasks-vision';

export interface PostureVisionAnalysis {
  score: number;
  eyeContact: number;
  faceDetected: boolean;
  centerOffset: number;
  faceSize: number;
  status: string;
  advice: string;
}

interface Point {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
  presence?: number;
}

interface FaceFeatures {
  centerX: number;
  centerY: number;
  faceSize: number;
  irisX: number;
  irisY: number;
  headYaw: number;
  headPitch: number;
}

interface PoseFeatures {
  shoulderSlope: number;
  headShoulderX: number;
  torsoLean: number;
}

interface FaceBaseline extends FaceFeatures {}

interface PoseBaseline extends PoseFeatures {}

interface VisionFeatures {
  face: FaceFeatures | null;
  pose: PoseFeatures | null;
}

const FACE_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

const POSE_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';

const WASM_URL =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm';

const INITIAL: PostureVisionAnalysis = {
  score: 0,
  eyeContact: 0,
  faceDetected: false,
  centerOffset: 0,
  faceSize: 0,
  status: 'Standby',
  advice:
    'Start the coach to begin posture and eye-contact tracking.',
};

const clamp = (
  value: number,
  min = 0,
  max = 100,
) => Math.max(min, Math.min(max, value));

const average = (values: number[]) =>
  values.length
    ? values.reduce(
        (sum, value) => sum + value,
        0,
      ) / values.length
    : 0;

const point = (
  landmarks: Point[],
  index: number,
) => landmarks[index];

const visible = (
  p?: Point,
  threshold = 0.35,
) =>
  Boolean(p) &&
  ((p?.visibility ?? p?.presence ?? 1) >= threshold);

const distance = (
  a: Point,
  b: Point,
) =>
  Math.hypot(
    a.x - b.x,
    a.y - b.y,
  );

const meanPoint = (
  points: Point[],
) => ({
  x: average(points.map((p) => p.x)),
  y: average(points.map((p) => p.y)),
});

const irisCenter = (
  landmarks: Point[],
  start: number,
  end: number,
) =>
  meanPoint(
    landmarks.slice(start, end + 1),
  );

const eyeRatio = (
  iris: Point,
  outer: Point,
  inner: Point,
) => {
  const width = Math.max(
    0.0001,
    Math.abs(inner.x - outer.x),
  );

  const horizontal =
    (iris.x -
      Math.min(
        outer.x,
        inner.x,
      )) / width;

  const vertical =
    iris.y -
    (outer.y + inner.y) / 2;

  const eyeHeight = Math.max(
    0.0001,
    width * 0.42,
  );

  return {
    x: horizontal,
    y: vertical / eyeHeight,
  };
};

export class PostureVisionEngine {
  private faceLandmarker: FaceLandmarker | null =
    null;

  private poseLandmarker: PoseLandmarker | null =
    null;

  private faceBaseline: FaceBaseline | null =
    null;

  private poseBaseline: PoseBaseline | null =
    null;

  private smoothed: PostureVisionAnalysis | null =
    null;

  private previousTimestamp = 0;

  async initialize() {
    if (
      this.faceLandmarker ||
      this.poseLandmarker
    ) {
      return;
    }

    const vision =
      await FilesetResolver.forVisionTasks(
        WASM_URL,
      );

    const errors: string[] = [];

    this.faceLandmarker =
      await this.createFaceLandmarker(
        vision,
      ).catch((error: unknown) => {
        console.warn(
          'Face Landmarker initialization failed:',
          error,
        );

        errors.push(
          `Face: ${
            error instanceof Error
              ? error.message
              : String(error)
          }`,
        );

        return null;
      });

    this.poseLandmarker =
      await this.createPoseLandmarker(
        vision,
      ).catch((error: unknown) => {
        console.warn(
          'Pose Landmarker initialization failed:',
          error,
        );

        errors.push(
          `Pose: ${
            error instanceof Error
              ? error.message
              : String(error)
          }`,
        );

        return null;
      });

    if (
      !this.faceLandmarker &&
      !this.poseLandmarker
    ) {
      throw new Error(
        `Neither vision model could initialize. ${errors.join(
          ' | ',
        )}`,
      );
    }

    if (!this.faceLandmarker) {
      console.warn(
        'Posture vision is running in pose-only mode because Face Landmarker could not initialize.',
      );
    }

    if (!this.poseLandmarker) {
      console.warn(
        'Posture vision is running in face-only mode because Pose Landmarker could not initialize.',
      );
    }
  }

  private async createFaceLandmarker(
    vision: Awaited<
      ReturnType<
        typeof FilesetResolver.forVisionTasks
      >
    >,
  ) {
    try {
      return await FaceLandmarker.createFromOptions(
        vision,
        {
          baseOptions: {
            modelAssetPath:
              FACE_MODEL_URL,
            delegate: 'GPU',
          },

          runningMode: 'VIDEO',

          numFaces: 1,

          minFaceDetectionConfidence: 0.35,

          minFacePresenceConfidence: 0.35,

          minTrackingConfidence: 0.35,

          outputFaceBlendshapes: false,

          outputFacialTransformationMatrixes:
            false,
        },
      );
    } catch (gpuError) {
      console.warn(
        'Face Landmarker GPU failed; retrying on CPU.',
        gpuError,
      );

      return FaceLandmarker.createFromOptions(
        vision,
        {
          baseOptions: {
            modelAssetPath:
              FACE_MODEL_URL,
            delegate: 'CPU',
          },

          runningMode: 'VIDEO',

          numFaces: 1,

          minFaceDetectionConfidence: 0.35,

          minFacePresenceConfidence: 0.35,

          minTrackingConfidence: 0.35,

          outputFaceBlendshapes: false,

          outputFacialTransformationMatrixes:
            false,
        },
      );
    }
  }

  private async createPoseLandmarker(
    vision: Awaited<
      ReturnType<
        typeof FilesetResolver.forVisionTasks
      >
    >,
  ) {
    try {
      return await PoseLandmarker.createFromOptions(
        vision,
        {
          baseOptions: {
            modelAssetPath:
              POSE_MODEL_URL,
            delegate: 'GPU',
          },

          runningMode: 'VIDEO',

          numPoses: 1,

          minPoseDetectionConfidence: 0.35,

          minPosePresenceConfidence: 0.35,

          minTrackingConfidence: 0.35,

          outputSegmentationMasks: false,
        },
      );
    } catch (gpuError) {
      console.warn(
        'Pose Landmarker GPU failed; retrying on CPU.',
        gpuError,
      );

      return PoseLandmarker.createFromOptions(
        vision,
        {
          baseOptions: {
            modelAssetPath:
              POSE_MODEL_URL,
            delegate: 'CPU',
          },

          runningMode: 'VIDEO',

          numPoses: 1,

          minPoseDetectionConfidence: 0.35,

          minPosePresenceConfidence: 0.35,

          minTrackingConfidence: 0.35,

          outputSegmentationMasks: false,
        },
      );
    }
  }

  private detect(
    video: HTMLVideoElement,
  ) {
    if (
      !this.faceLandmarker &&
      !this.poseLandmarker
    ) {
      throw new Error(
        'MediaPipe vision models are not initialized.',
      );
    }

    if (
      video.readyState <
        HTMLMediaElement.HAVE_CURRENT_DATA ||
      video.videoWidth < 2 ||
      video.videoHeight < 2
    ) {
      return null;
    }

    /*
     * Do NOT gate this on video.currentTime.
     *
     * With MediaStream video, currentTime is not
     * a reliable frame-change signal for our
     * calibration loop.
     */
    const timestamp = Math.max(
      this.previousTimestamp + 1,
      Math.round(performance.now()),
    );

    this.previousTimestamp =
      timestamp;

    const face =
      this.faceLandmarker
        ? this.faceLandmarker.detectForVideo(
            video,
            timestamp,
          )
        : null;

    const pose =
      this.poseLandmarker
        ? this.poseLandmarker.detectForVideo(
            video,
            timestamp,
          )
        : null;

    return {
      face,
      pose,
    };
  }

  private extractFeatures(
    video: HTMLVideoElement,
  ): VisionFeatures | null {
    const result =
      this.detect(video);

    if (!result) {
      return null;
    }

    const faceLandmarks =
      result.face?.faceLandmarks?.[0] as
        | Point[]
        | undefined;

    const poseLandmarks =
      result.pose?.landmarks?.[0] as
        | Point[]
        | undefined;

    let face: FaceFeatures | null =
      null;

    /*
     * FACE
     */
    if (
      faceLandmarks &&
      faceLandmarks.length >= 478
    ) {
      const leftOuter =
        point(faceLandmarks, 33);

      const leftInner =
        point(faceLandmarks, 133);

      const rightInner =
        point(faceLandmarks, 362);

      const rightOuter =
        point(faceLandmarks, 263);

      const leftIris =
        irisCenter(
          faceLandmarks,
          468,
          472,
        );

      const rightIris =
        irisCenter(
          faceLandmarks,
          473,
          477,
        );

      const nose =
        point(faceLandmarks, 1);

      const forehead =
        point(faceLandmarks, 10);

      const chin =
        point(faceLandmarks, 152);

      if (
        leftOuter &&
        leftInner &&
        rightInner &&
        rightOuter &&
        leftIris &&
        rightIris &&
        nose &&
        forehead &&
        chin
      ) {
        const leftEye =
          eyeRatio(
            leftIris,
            leftOuter,
            leftInner,
          );

        const rightEye =
          eyeRatio(
            rightIris,
            rightOuter,
            rightInner,
          );

        const irisX =
          (leftEye.x +
            rightEye.x) /
          2;

        const irisY =
          (leftEye.y +
            rightEye.y) /
          2;

        const eyeCenter =
          meanPoint([
            leftOuter,
            leftInner,
            rightInner,
            rightOuter,
          ]);

        const eyeWidth =
          Math.max(
            0.0001,
            distance(
              leftOuter,
              rightOuter,
            ),
          );

        const headYaw =
          (nose.x -
            eyeCenter.x) /
          eyeWidth;

        const eyeLineY =
          (leftOuter.y +
            leftInner.y +
            rightInner.y +
            rightOuter.y) /
          4;

        const faceHeight =
          Math.max(
            0.0001,
            Math.abs(
              chin.y -
                forehead.y,
            ),
          );

        const headPitch =
          (nose.y - eyeLineY) /
          faceHeight;

        const xs =
          faceLandmarks.map(
            (p) => p.x,
          );

        const ys =
          faceLandmarks.map(
            (p) => p.y,
          );

        const minX =
          Math.min(...xs);

        const maxX =
          Math.max(...xs);

        const minY =
          Math.min(...ys);

        const maxY =
          Math.max(...ys);

        face = {
          centerX:
            (minX + maxX) /
            2,

          centerY:
            (minY + maxY) /
            2,

          faceSize:
            maxX - minX,

          irisX,

          irisY,

          headYaw,

          headPitch,
        };
      }
    }

    /*
     * BODY / POSE
     */
    let pose: PoseFeatures | null =
      null;

    if (
      poseLandmarks &&
      poseLandmarks.length >= 25
    ) {
      const leftShoulder =
        point(poseLandmarks, 11);

      const rightShoulder =
        point(poseLandmarks, 12);

      const leftHip =
        point(poseLandmarks, 23);

      const rightHip =
        point(poseLandmarks, 24);

      const leftEar =
        point(poseLandmarks, 7);

      const rightEar =
        point(poseLandmarks, 8);

      const nose =
        point(poseLandmarks, 0);

      if (
        leftShoulder &&
        rightShoulder &&
        visible(leftShoulder) &&
        visible(rightShoulder)
      ) {
        const shoulderCenter =
          meanPoint([
            leftShoulder,
            rightShoulder,
          ]);

        const shoulderSlope =
          Math.atan2(
            rightShoulder.y -
              leftShoulder.y,
            rightShoulder.x -
              leftShoulder.x,
          );

        const headShoulderX =
          nose
            ? nose.x -
              shoulderCenter.x
            : 0;

        let torsoLean = 0;

        if (
          leftHip &&
          rightHip &&
          visible(leftHip) &&
          visible(rightHip)
        ) {
          const hipCenter =
            meanPoint([
              leftHip,
              rightHip,
            ]);

          torsoLean =
            shoulderCenter.x -
            hipCenter.x;
        } else if (
          leftEar &&
          rightEar &&
          visible(leftEar) &&
          visible(rightEar)
        ) {
          const earCenter =
            meanPoint([
              leftEar,
              rightEar,
            ]);

          torsoLean =
            shoulderCenter.x -
            earCenter.x;
        }

        pose = {
          shoulderSlope,

          headShoulderX,

          torsoLean,
        };
      }
    }

    return {
      face,
      pose,
    };
  }

  async calibrate(
    video: HTMLVideoElement,
    durationMs = 1600,
  ) {
    const faceSamples: FaceFeatures[] =
      [];

    const poseSamples: PoseFeatures[] =
      [];

    const started =
      performance.now();

    this.faceBaseline = null;
    this.poseBaseline = null;
    this.smoothed = null;

    while (
      performance.now() -
        started <
      durationMs
    ) {
      const features =
        this.extractFeatures(video);

      if (features?.face) {
        faceSamples.push(
          features.face,
        );
      }

      if (features?.pose) {
        poseSamples.push(
          features.pose,
        );
      }

      await new Promise<void>(
        (resolve) => {
          window.setTimeout(
            resolve,
            70,
          );
        },
      );
    }

    /*
     * IMPORTANT:
     *
     * Calibration no longer throws.
     *
     * Even one real detected frame is
     * enough to establish a baseline.
     *
     * If nothing is detected, live
     * detection simply keeps trying.
     */
    if (faceSamples.length > 0) {
      this.faceBaseline = {
        centerX: average(
          faceSamples.map(
            (s) => s.centerX,
          ),
        ),

        centerY: average(
          faceSamples.map(
            (s) => s.centerY,
          ),
        ),

        faceSize: average(
          faceSamples.map(
            (s) => s.faceSize,
          ),
        ),

        irisX: average(
          faceSamples.map(
            (s) => s.irisX,
          ),
        ),

        irisY: average(
          faceSamples.map(
            (s) => s.irisY,
          ),
        ),

        headYaw: average(
          faceSamples.map(
            (s) => s.headYaw,
          ),
        ),

        headPitch: average(
          faceSamples.map(
            (s) => s.headPitch,
          ),
        ),
      };
    }

    if (poseSamples.length > 0) {
      this.poseBaseline = {
        shoulderSlope:
          average(
            poseSamples.map(
              (s) =>
                s.shoulderSlope,
            ),
          ),

        headShoulderX:
          average(
            poseSamples.map(
              (s) =>
                s.headShoulderX,
            ),
          ),

        torsoLean:
          average(
            poseSamples.map(
              (s) =>
                s.torsoLean,
            ),
          ),
      };
    }

    if (
      faceSamples.length === 0 &&
      poseSamples.length === 0
    ) {
      console.warn(
        'Posture calibration captured no landmarks. The coach will keep trying on live frames.',
      );
    } else {
      console.info(
        `Posture calibration complete: ${faceSamples.length} face samples, ${poseSamples.length} pose samples.`,
      );
    }
  }

  analyze(
    video: HTMLVideoElement,
  ): PostureVisionAnalysis {
    const features =
      this.extractFeatures(video);

    if (!features) {
      return (
        this.smoothed ??
        INITIAL
      );
    }

    const hasFace =
      Boolean(features.face);

    const hasPose =
      Boolean(features.pose);

    if (!hasFace && !hasPose) {
      const result: PostureVisionAnalysis =
        {
          ...INITIAL,

          status:
            'No Person Detected',

          advice:
            'Keep your face and shoulders visible inside the camera frame.',
        };

      this.smoothed = result;

      return result;
    }

    let postureScore = 0;

    let framingScore = 100;

    let gazeScore = 0;

    /*
     * BODY POSTURE
     */
    if (features.pose) {
      const pose =
        features.pose;

      const baseline =
        this.poseBaseline;

      const shoulderDelta =
        baseline
          ? Math.abs(
              pose.shoulderSlope -
                baseline.shoulderSlope,
            )
          : Math.abs(
              pose.shoulderSlope,
            );

      const headShoulderDelta =
        baseline
          ? Math.abs(
              pose.headShoulderX -
                baseline.headShoulderX,
            )
          : Math.abs(
              pose.headShoulderX,
            );

      const torsoDelta =
        baseline
          ? Math.abs(
              pose.torsoLean -
                baseline.torsoLean,
            )
          : Math.abs(
              pose.torsoLean,
            );

      postureScore =
        clamp(
          100 -
            shoulderDelta * 190 -
            headShoulderDelta * 180 -
            torsoDelta * 260,
        );
    }

    let centerOffset = 0;

    if (features.face) {
      const face =
        features.face;

      const baseline =
        this.faceBaseline;

      centerOffset =
        baseline
          ? Math.abs(
              face.centerX -
                baseline.centerX,
            )
          : Math.abs(
              face.centerX - 0.5,
            );

      const verticalOffset =
        baseline
          ? Math.abs(
              face.centerY -
                baseline.centerY,
            )
          : Math.abs(
              face.centerY - 0.45,
            );

      const faceSizeDelta =
        baseline
          ? Math.abs(
              face.faceSize -
                baseline.faceSize,
            )
          : 0;

      framingScore =
        clamp(
          100 -
            centerOffset * 420 -
            verticalOffset * 180 -
            faceSizeDelta * 180,
        );

      const irisDelta =
        baseline
          ? Math.hypot(
              face.irisX -
                baseline.irisX,
              face.irisY -
                baseline.irisY,
            )
          : Math.hypot(
              face.irisX - 0.5,
              face.irisY,
            );

      const headYawDelta =
        baseline
          ? Math.abs(
              face.headYaw -
                baseline.headYaw,
            )
          : Math.abs(
              face.headYaw,
            );

      const headPitchDelta =
        baseline
          ? Math.abs(
              face.headPitch -
                baseline.headPitch,
            )
          : Math.abs(
              face.headPitch - 0.18,
            );

      gazeScore =
        clamp(
          100 -
            irisDelta * 110 -
            headYawDelta * 70 -
            headPitchDelta * 70,
        );

      if (!features.pose) {
        postureScore =
          clamp(
            100 -
              headYawDelta * 70 -
              headPitchDelta * 70,
          );
      }
    }

    const score = Math.round(
      hasPose && hasFace
        ? postureScore * 0.58 +
            framingScore * 0.20 +
            gazeScore * 0.22
        : hasPose
          ? postureScore * 0.85 +
            framingScore * 0.15
          : postureScore * 0.78 +
            framingScore * 0.22,
    );

    let status =
      'Optimal Upright';

    let advice =
      'Strong posture. Keep your shoulders relaxed and maintain natural eye contact.';

    /*
     * BODY FEEDBACK
     */
    if (features.pose) {
      const pose =
        features.pose;

      const baseline =
        this.poseBaseline;

      const shoulderDelta =
        baseline
          ? Math.abs(
              pose.shoulderSlope -
                baseline.shoulderSlope,
            )
          : Math.abs(
              pose.shoulderSlope,
            );

      const torsoDelta =
        baseline
          ? Math.abs(
              pose.torsoLean -
                baseline.torsoLean,
            )
          : Math.abs(
              pose.torsoLean,
            );

      if (
        shoulderDelta >
        0.12
      ) {
        status =
          'Level Your Shoulders';

        advice =
          'One shoulder is sitting noticeably higher. Relax and level your shoulders.';
      } else if (
        torsoDelta >
        0.10
      ) {
        status =
          'Straighten Your Posture';

        advice =
          'Your upper body is leaning away from your natural position. Sit tall without stiffening.';
      }
    }

    /*
     * FACE FEEDBACK
     */
    if (features.face) {
      const face =
        features.face;

      const baseline =
        this.faceBaseline;

      const headYawDelta =
        baseline
          ? Math.abs(
              face.headYaw -
                baseline.headYaw,
            )
          : Math.abs(
              face.headYaw,
            );

      const headPitchDelta =
        baseline
          ? Math.abs(
              face.headPitch -
                baseline.headPitch,
            )
          : Math.abs(
              face.headPitch - 0.18,
            );

      if (
        centerOffset >
        0.18
      ) {
        const targetX =
          baseline?.centerX ??
          0.5;

        if (
          face.centerX <
          targetX
        ) {
          status =
            'Center Yourself';

          advice =
            'Move slightly right so your face stays naturally centred in the frame.';
        } else {
          status =
            'Move Slightly Left';

          advice =
            'Move slightly left so your face stays naturally centred in the frame.';
        }
      } else if (
        headYawDelta >
        0.16
      ) {
        status =
          'Face Forward';

        advice =
          'Turn your face slightly toward the camera while keeping your posture relaxed.';
      } else if (
        headPitchDelta >
        0.13
      ) {
        status =
          'Adjust Head Position';

        advice =
          'Bring your head back to a comfortable neutral position and keep your gaze natural.';
      } else if (
        hasPose &&
        postureScore >= 70 &&
        gazeScore >= 70
      ) {
        status =
          'Optimal Upright';

        advice =
          'Strong posture and camera alignment. Keep your shoulders relaxed and speak naturally.';
      }
    } else {
      if (
        status ===
        'Optimal Upright'
      ) {
        status =
          'Body Tracking Active';
      }

      advice =
        status ===
        'Body Tracking Active'
          ? 'Your body is being tracked. Move naturally; facial eye-contact tracking will appear when your face is detected.'
          : advice;
    }

    const result: PostureVisionAnalysis =
      {
        score: clamp(score),

        eyeContact: hasFace
          ? clamp(
              Math.round(
                gazeScore,
              ),
            )
          : 0,

        faceDetected: hasFace,

        centerOffset:
          Math.round(
            centerOffset * 100,
          ),

        faceSize:
          Math.round(
            features.face
              ? features.face
                  .faceSize * 100
              : 0,
          ),

        status,

        advice,
      };

    if (!this.smoothed) {
      this.smoothed =
        result;

      return result;
    }

    const alpha = 0.32;

    const smoothed: PostureVisionAnalysis =
      {
        ...result,

        score: Math.round(
          this.smoothed.score *
            (1 - alpha) +
            result.score * alpha,
        ),

        eyeContact:
          Math.round(
            this.smoothed
              .eyeContact *
              (1 - alpha) +
              result.eyeContact *
                alpha,
          ),

        centerOffset:
          Math.round(
            this.smoothed
              .centerOffset *
              (1 - alpha) +
              result.centerOffset *
                alpha,
          ),

        faceSize:
          Math.round(
            this.smoothed
              .faceSize *
              (1 - alpha) +
              result.faceSize *
                alpha,
          ),
      };

    this.smoothed =
      smoothed;

    return smoothed;
  }

  reset() {
    this.faceBaseline =
      null;

    this.poseBaseline =
      null;

    this.smoothed =
      null;

    this.previousTimestamp =
      0;
  }

  close() {
    this.faceLandmarker?.close();

    this.poseLandmarker?.close();

    this.faceLandmarker =
      null;

    this.poseLandmarker =
      null;

    this.reset();
  }
}

export const createPostureVision =
  () =>
    new PostureVisionEngine();