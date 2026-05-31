from unittest.mock import patch


def test_assess_missing_text(client, sample_wav):
    resp = client.post(
        "/assess",
        files={"audio": ("test.wav", sample_wav, "audio/wav")},
    )
    assert resp.status_code == 422  # FastAPI form field missing


def test_assess_empty_text(client, sample_wav):
    resp = client.post(
        "/assess",
        data={"target_text": "   "},
        files={"audio": ("test.wav", sample_wav, "audio/wav")},
    )
    assert resp.status_code == 400
    assert "error" in resp.json()


def test_assess_audio_too_small(client):
    resp = client.post(
        "/assess",
        data={"target_text": "hello"},
        files={"audio": ("test.wav", b"tiny", "audio/wav")},
    )
    assert resp.status_code == 400
    assert "error" in resp.json()


@patch("app.api.endpoints.assess.PhonemePipeline")
def test_assess_ok(mock_pipeline_class, client, sample_wav):
    mock_pipeline_class.return_value.assess.return_value = {
        "overall_score": 85.0,
        "alignment": [
            {"expected": "h", "recognized": "h", "status": "correct"},
            {"expected": "ʌ", "recognized": "a", "status": "substitution"},
        ],
        "expected_phones": ["h", "ʌ"],
        "recognized_phones": ["h", "a"],
        "target_text": "hello",
    }

    resp = client.post(
        "/assess",
        data={"target_text": "hello"},
        files={"audio": ("test.wav", sample_wav, "audio/wav")},
    )

    assert resp.status_code == 200
    data = resp.json()
    assert data["overall_score"] == 85.0
    assert len(data["alignment"]) == 2
    assert data["alignment"][0]["status"] == "correct"
