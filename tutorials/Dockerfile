FROM ubuntu:20.04 AS builder

RUN \
  apt update && \
  apt install -y \
    git \
    python3-pip \
    rclone && \
  cd /tmp && \
  git clone https://github.com/dfinity/ic.git && \
  cd ic && \
  pip3 install --user -r gitlab-ci/src/requirements.txt && \
  gitlab-ci/src/artifacts/rclone_download.py \
    --latest-to \
    --mark-executable \
    --out=artifacts/release \
    --remote-path=release \
    --unpack && \
  gitlab-ci/src/artifacts/rclone_download.py \
    --latest-to \
    --out=artifacts/canisters \
    --remote-path=canisters \
    --unpack && \
  find artifacts -name '*.gz' -exec rm '{}' \;

FROM ubuntu:20.04

COPY --from=builder /tmp/ic/artifacts /root/ic-artifacts
COPY --from=builder /tmp/ic/rs/rosetta-api/log_config.yml /root
COPY entry.sh /root

ENV \
  PATH=${PATH}:/root/ic-artifacts/release

WORKDIR /root

RUN \
  apt update && \
  apt full-upgrade -y && \
  apt install -y \
    liblmdb0 \
    libsqlite3-0 \
    libssl1.1

ENTRYPOINT ["/root/entry.sh"]
