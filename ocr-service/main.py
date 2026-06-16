"""RapidOCR + zxing-cpp 条码扫描 HTTP 微服务 — 端口 8866"""
import base64
import io
import os
import time
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, Field
from rapidocr_onnxruntime import RapidOCR
from PIL import Image
from zxingcpp import read_barcode, BarcodeFormat

app = FastAPI(title="RapidOCR + Barcode Service", version="2.0.0")

# 配置
OCR_API_KEY = os.environ.get("OCR_API_KEY", "")
OCR_HOST = os.environ.get("OCR_HOST", "127.0.0.1")
OCR_PORT = int(os.environ.get("OCR_PORT", "8866"))
MAX_IMAGE_SIZE_MB = int(os.environ.get("OCR_MAX_IMAGE_SIZE_MB", "10"))
MAX_IMAGES_PER_REQUEST = int(os.environ.get("OCR_MAX_IMAGES_PER_REQUEST", "5"))

# 条码格式名称映射
BARCODE_FORMAT_NAMES = {
    BarcodeFormat.Aztec: "AZTEC",
    BarcodeFormat.Codabar: "CODABAR",
    BarcodeFormat.Code128: "CODE_128",
    BarcodeFormat.Code39: "CODE_39",
    BarcodeFormat.Code93: "CODE_93",
    BarcodeFormat.DataMatrix: "DATA_MATRIX",
    BarcodeFormat.EAN13: "EAN_13",
    BarcodeFormat.EAN8: "EAN_8",
    BarcodeFormat.ITF: "ITF",
    BarcodeFormat.PDF417: "PDF_417",
    BarcodeFormat.QRCode: "QR_CODE",
    BarcodeFormat.UPCA: "UPC_A",
    BarcodeFormat.UPCE: "UPC_E",
}

# 初始化 RapidOCR（无参默认配置，CPU ONNX）
ocr = RapidOCR()


def _verify_api_key(x_api_key: str | None):
    """验证 API Key（未配置则跳过）"""
    if not OCR_API_KEY:
        return
    if not x_api_key or x_api_key != OCR_API_KEY:
        raise HTTPException(status_code=401, detail="无效的API密钥")


def _decode_image(img_data: str) -> Image.Image:
    """解码 base64 图片为 PIL Image"""
    max_bytes = MAX_IMAGE_SIZE_MB * 1024 * 1024

    # 支持 "data:image/...;base64,xxx" 和纯 base64
    if img_data.startswith("data:"):
        b64 = img_data.split(",", 1)[1]
    else:
        b64 = img_data

    # 输入大小限制
    if len(b64) > max_bytes * 1.37:  # base64 膨胀约 37%
        raise HTTPException(
            status_code=413,
            detail=f"图片大小超过{MAX_IMAGE_SIZE_MB}MB限制",
        )

    try:
        img_bytes = base64.b64decode(b64)
    except Exception:
        raise HTTPException(status_code=400, detail="无效的base64编码")

    if len(img_bytes) > max_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"解码后图片大小超过{MAX_IMAGE_SIZE_MB}MB限制",
        )

    return Image.open(io.BytesIO(img_bytes))


def _run_ocr(image: Image.Image) -> dict:
    """执行 RapidOCR 文本识别"""
    import numpy as np
    img_array = np.array(image)

    start = time.perf_counter()
    ocr_result, _ = ocr(img_array)
    latency = time.perf_counter() - start

    if ocr_result:
        lines = [
            {"text": item[1], "confidence": round(item[2], 4)}
            for item in ocr_result
        ]
    else:
        lines = []

    return {
        "lines": lines,
        "lineCount": len(lines),
        "latencyMs": round(latency * 1000, 1),
    }


def _scan_barcodes(image: Image.Image) -> dict:
    """执行 zxing-cpp 条码扫描"""
    start = time.perf_counter()
    results = read_barcode(image)
    latency = time.perf_counter() - start

    barcodes = []
    for barcode in results:
        format_name = BARCODE_FORMAT_NAMES.get(barcode.format, str(barcode.format))
        barcodes.append({
            "text": barcode.text,
            "format": format_name,
        })

    return {
        "barcodes": barcodes,
        "barcodeCount": len(barcodes),
        "latencyMs": round(latency * 1000, 1),
    }


class OCRRequest(BaseModel):
    images: list[str] = Field(
        ...,
        max_length=MAX_IMAGES_PER_REQUEST,
        description=f"base64 data URIs，最多{MAX_IMAGES_PER_REQUEST}张",
    )


@app.post("/ocr/text")
def ocr_text(req: OCRRequest, x_api_key: str | None = Header(None)):
    """纯 OCR 文本识别（向后兼容）"""
    _verify_api_key(x_api_key)

    results = []
    for img_data in req.images:
        image = _decode_image(img_data)
        results.append(_run_ocr(image))

    return {"success": True, "data": results}


@app.post("/ocr/full")
def ocr_full(req: OCRRequest, x_api_key: str | None = Header(None)):
    """OCR 文本识别 + 条码扫描"""
    _verify_api_key(x_api_key)

    results = []
    for img_data in req.images:
        image = _decode_image(img_data)

        # 并行执行 OCR 文本识别和条码扫描
        ocr_result = _run_ocr(image)
        barcode_result = _scan_barcodes(image)

        results.append({
            "lines": ocr_result["lines"],
            "lineCount": ocr_result["lineCount"],
            "ocrLatencyMs": ocr_result["latencyMs"],
            "barcodes": barcode_result["barcodes"],
            "barcodeCount": barcode_result["barcodeCount"],
            "barcodeLatencyMs": barcode_result["latencyMs"],
        })

    return {"success": True, "data": results}


@app.get("/health")
def health():
    return {"status": "ok", "engine": "rapidocr_onnxruntime + zxing-cpp"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=OCR_HOST, port=OCR_PORT)
