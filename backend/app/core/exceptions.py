class PronuncyError(Exception):
    """Base exception for the application."""


class AudioDecodeError(PronuncyError):
    """Raised when audio bytes cannot be decoded."""


class ModelInferenceError(PronuncyError):
    """Raised when the phoneme model fails during inference."""


class ValidationError(PronuncyError):
    """Raised when input validation fails."""


class NotFoundError(PronuncyError):
    """Raised when a requested resource is not found."""
