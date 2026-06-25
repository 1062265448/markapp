FROM python:3.10-slim

WORKDIR /app

# 清除Docker Desktop注入的代理
RUN unset http_proxy https_proxy HTTP_PROXY HTTPS_PROXY no_proxy NO_PROXY && \
    echo 'Acquire::http::Proxy "false";' > /etc/apt/apt.conf.d/99no-proxy && \
    echo 'Acquire::https::Proxy "false";' > /etc/apt/apt.conf.d/99no-proxy

# 清华源 + 系统依赖（zxing-cpp需要libstdc++等）
RUN sed -i 's|deb.debian.org|mirrors.tuna.tsinghua.edu.cn|g' /etc/apt/sources.list.d/debian.sources && \
    apt-get update && apt-get install -y --no-install-recommends \
    libgomp1 libgl1 libglib2.0-0t64 libsm6 libxext6 libxrender1 libstdc++6 \
    && rm -rf /var/lib/apt/lists/* && rm -f /etc/apt/apt.conf.d/99no-proxy

# 安装Python依赖
RUN pip config set global.index-url https://pypi.tuna.tsinghua.edu.cn/simple && \
    pip config set global.proxy http://host.docker.internal:7897 && \
    pip install --no-cache-dir \
    rapidocr_onnxruntime>=1.3 \
    opencv-python-headless \
    fastapi>=0.110 \
    uvicorn>=0.29 \
    Pillow>=10.0 \
    numpy>=1.24 \
    pydantic>=2.0 \
    zxing-cpp>=3.0.0 \
    && pip config unset global.proxy

# 运行时清除代理
ENV http_proxy=""
ENV https_proxy=""
ENV HTTP_PROXY=""
ENV HTTPS_PROXY=""
ENV no_proxy=""
ENV NO_PROXY=""

COPY main.py /app/

EXPOSE 8866

CMD ["python", "main.py"]
