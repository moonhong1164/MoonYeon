FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
ENV TZ=Asia/Seoul
CMD ["python", "-m", "moonyeon", "bot"]
