from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass
from typing import Any

import cv2
import numpy as np
from deepface import DeepFace

# ============================================================
# FACE RECOGNITION CONFIGURATION
# ============================================================

FACE_MODEL = "ArcFace"

FACE_DETECTOR = "retinaface"

FACE_FALLBACK_DETECTOR = "opencv"

FACE_DISTANCE_METRIC = "cosine"

# Development threshold.
#
# Lower cosine distance = better match.
#
# Start with 0.40 and calibrate later using real
# registered and unknown faces.
FACE_MATCH_THRESHOLD = 0.40


# ============================================================
# RESULT TYPES
# ============================================================


@dataclass
class FaceEmbeddingResult:
    """
    Result returned after generating a face embedding.
    """

    embedding: list[float]

    facial_area: dict[str, Any]

    model_name: str

    detector_backend: str


@dataclass
class FaceMatchResult:
    """
    Result returned after comparing two face embeddings.
    """

    matched: bool

    distance: float

    threshold: float

    confidence: float


# ============================================================
# FACE SERVICE
# ============================================================


class FaceService:
    """
    Central face-recognition service.

    Responsibilities:

    - Detect faces
    - Use RetinaFace with OpenCV fallback
    - Require exactly one face
    - Generate ArcFace embeddings
    - Generate 512-dimensional embeddings
    - Compare embeddings using cosine distance
    - Find the best match among enrollment embeddings
    """

    def __init__(
        self,
        model_name: str = FACE_MODEL,
        detector_backend: str = FACE_DETECTOR,
        fallback_detector: str = FACE_FALLBACK_DETECTOR,
        distance_metric: str = FACE_DISTANCE_METRIC,
        threshold: float = FACE_MATCH_THRESHOLD,
    ) -> None:

        self.model_name = model_name

        self.detector_backend = detector_backend

        self.fallback_detector = fallback_detector

        self.distance_metric = distance_metric

        self.threshold = threshold

    # ========================================================
    # IMAGE BYTES → NUMPY IMAGE
    # ========================================================

    @staticmethod
    def _bytes_to_image(
        image_bytes: bytes,
    ) -> np.ndarray:
        """
        Convert uploaded image bytes into an OpenCV image.
        """

        if not image_bytes:
            raise ValueError("Image data is empty.")

        image_array = np.frombuffer(
            image_bytes,
            dtype=np.uint8,
        )

        image = cv2.imdecode(
            image_array,
            cv2.IMREAD_COLOR,
        )

        if image is None or image.size == 0:
            raise ValueError("Unable to decode the uploaded image.")

        return image

    # ========================================================
    # GENERATE SINGLE FACE EMBEDDING
    # ========================================================

    def generate_embedding(
        self,
        image: np.ndarray | bytes,
    ) -> FaceEmbeddingResult:
        """
        Detect exactly one face and generate its
        ArcFace embedding.

        RetinaFace is attempted first.

        If RetinaFace fails, OpenCV is attempted.

        Exactly one face must be detected.
        """

        # ----------------------------------------------------
        # Convert bytes to OpenCV image
        # ----------------------------------------------------

        if isinstance(image, bytes):
            image = self._bytes_to_image(image)

        if image is None or image.size == 0:
            raise ValueError("Image is empty.")

        # ----------------------------------------------------
        # Detector order
        # ----------------------------------------------------

        detectors_to_try = [
            self.detector_backend,
            self.fallback_detector,
        ]

        representations: Any = None

        successful_detector: str | None = None

        last_exception: Exception | None = None

        # ----------------------------------------------------
        # Try detectors
        # ----------------------------------------------------

        for detector in detectors_to_try:
            try:
                representations = DeepFace.represent(
                    img_path=image,
                    model_name=self.model_name,
                    detector_backend=detector,
                    enforce_detection=True,
                    align=True,
                    normalization="ArcFace",
                )

                if representations:
                    successful_detector = detector

                    break

            except Exception as exc:
                last_exception = exc

                print(f"Face detector '{detector}' failed: {exc}")

                continue

        # ----------------------------------------------------
        # No face found
        # ----------------------------------------------------

        if not representations:
            raise ValueError("No face detected in the image.") from last_exception

        # ----------------------------------------------------
        # Normalize DeepFace response
        # ----------------------------------------------------

        if not isinstance(
            representations,
            list,
        ):
            representations = [representations]

        # ----------------------------------------------------
        # Exactly one face required
        # ----------------------------------------------------

        if len(representations) != 1:
            raise ValueError(
                f"Expected exactly one face, but detected {len(representations)} faces."
            )

        representation: dict[str, Any] = representations[0]

        # ----------------------------------------------------
        # Extract embedding
        # ----------------------------------------------------

        embedding = representation.get("embedding")

        facial_area = representation.get(
            "facial_area",
            {},
        )

        if not embedding:
            raise ValueError("Face embedding could not be generated.")

        # ----------------------------------------------------
        # Convert embedding values to float
        # ----------------------------------------------------

        embedding_values = [float(value) for value in embedding]

        # ----------------------------------------------------
        # Validate embedding dimension
        # ----------------------------------------------------

        if len(embedding_values) != 512:
            raise ValueError(
                "ArcFace must produce a "
                "512-dimensional embedding. "
                f"Received {len(embedding_values)}."
            )

        # ----------------------------------------------------
        # Validate embedding values
        # ----------------------------------------------------

        embedding_array = np.asarray(
            embedding_values,
            dtype=np.float32,
        )

        if not np.isfinite(embedding_array).all():
            raise ValueError("Face embedding contains invalid values.")

        # ----------------------------------------------------
        # Return result
        # ----------------------------------------------------

        return FaceEmbeddingResult(
            embedding=embedding_values,
            facial_area=facial_area,
            model_name=self.model_name,
            detector_backend=(successful_detector or self.detector_backend),
        )

    # ========================================================
    # GENERATE EMBEDDING FROM BYTES
    # ========================================================

    def generate_embedding_from_bytes(
        self,
        image_bytes: bytes,
    ) -> FaceEmbeddingResult:
        """
        Generate an embedding directly from
        uploaded image bytes.
        """

        return self.generate_embedding(image_bytes)

    # ========================================================
    # BATCH EMBEDDING GENERATION
    # ========================================================

    def generate_embeddings_batch(
        self,
        images: Sequence[np.ndarray | bytes],
    ) -> list[FaceEmbeddingResult]:
        """
        Generate embeddings for multiple
        enrollment photographs.

        Your registration flow uses five
        photographs per student.
        """

        results: list[FaceEmbeddingResult] = []

        for index, image in enumerate(images):
            try:
                result = self.generate_embedding(image)

                results.append(result)

            except (
                ValueError,
                RuntimeError,
            ) as exc:
                raise ValueError(
                    f"Failed to process face photo #{index + 1}: {exc}"
                ) from exc

        return results

    # ========================================================
    # COMPARE TWO EMBEDDINGS
    # ========================================================

    def compare_embeddings(
        self,
        source_embedding: (list[float] | np.ndarray),
        target_embedding: (list[float] | np.ndarray),
    ) -> FaceMatchResult:
        """
        Compare two face embeddings using
        cosine distance.

        Distance:

            0.00 → very similar
            1.00 → very different

        A match occurs when:

            distance <= threshold
        """

        # ----------------------------------------------------
        # Convert to NumPy
        # ----------------------------------------------------

        source = np.asarray(
            source_embedding,
            dtype=np.float32,
        )

        target = np.asarray(
            target_embedding,
            dtype=np.float32,
        )

        # ----------------------------------------------------
        # Validate dimensions
        # ----------------------------------------------------

        if source.ndim != 1:
            raise ValueError("Source embedding must be a one-dimensional vector.")

        if target.ndim != 1:
            raise ValueError("Target embedding must be a one-dimensional vector.")

        if source.shape != target.shape:
            raise ValueError("Face embeddings have different dimensions.")

        # ----------------------------------------------------
        # Validate values
        # ----------------------------------------------------

        if not np.isfinite(source).all():
            raise ValueError("Source embedding contains NaN or infinite values.")

        if not np.isfinite(target).all():
            raise ValueError("Target embedding contains NaN or infinite values.")

        # ----------------------------------------------------
        # Calculate vector norms
        # ----------------------------------------------------

        source_norm = np.linalg.norm(source)

        target_norm = np.linalg.norm(target)

        if source_norm == 0.0:
            raise ValueError("Source embedding has zero magnitude.")

        if target_norm == 0.0:
            raise ValueError("Target embedding has zero magnitude.")

        # ----------------------------------------------------
        # Cosine similarity
        # ----------------------------------------------------

        similarity = float(np.dot(source, target) / (source_norm * target_norm))

        # Prevent floating-point errors
        # outside [-1, 1].

        similarity = max(
            -1.0,
            min(
                1.0,
                similarity,
            ),
        )

        # ----------------------------------------------------
        # Cosine distance
        # ----------------------------------------------------

        distance = 1.0 - similarity

        distance = max(
            0.0,
            min(
                2.0,
                distance,
            ),
        )

        # ----------------------------------------------------
        # Match decision
        # ----------------------------------------------------

        matched = distance <= self.threshold

        # ----------------------------------------------------
        # Confidence
        # ----------------------------------------------------

        if self.threshold <= 0:
            confidence = 0.0

        else:
            confidence = 1.0 - (distance / self.threshold)

            confidence = max(
                0.0,
                min(
                    1.0,
                    confidence,
                ),
            )

        return FaceMatchResult(
            matched=matched,
            distance=float(distance),
            threshold=self.threshold,
            confidence=float(confidence),
        )

    # ========================================================
    # FIND BEST MATCH
    # ========================================================

    def find_best_match(
        self,
        live_embedding: (list[float] | np.ndarray),
        stored_embeddings: list[list[float] | np.ndarray],
    ) -> FaceMatchResult | None:
        """
        Compare a live embedding against
        multiple stored enrollment embeddings.

        Returns the closest match.
        """

        if not stored_embeddings:
            return None

        best_result: FaceMatchResult | None = None

        for stored_embedding in stored_embeddings:
            try:
                result = self.compare_embeddings(
                    source_embedding=(live_embedding),
                    target_embedding=(stored_embedding),
                )

                if best_result is None or result.distance < best_result.distance:
                    best_result = result

            except ValueError:
                # Ignore malformed stored
                # embeddings and continue.

                continue

        return best_result


# ============================================================
# SINGLE SERVICE INSTANCE
# ============================================================

face_service = FaceService()
