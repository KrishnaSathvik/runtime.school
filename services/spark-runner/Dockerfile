# Real Apache Spark sandbox for runtime.school PySpark (local development only; see README.md "Security assumptions").
#
#   docker build -t runtime-spark-runner:4.0.1-5 services/spark-runner
#
# 4.0.1-2 adds pandas/pyarrow/numpy, delta-spark, spark-avro and two JDBC drivers (SQLite, H2) on top of 4.0.1-1.
# Everything is fetched here, at build time: jobs run with --network none.
#
# Reproducible: both base images are pinned by multi-arch index digest, Python packages by hash, jars by SHA-256.
# Java comes from the pinned Temurin image instead of apt, whose package versions can't be pinned durably.

# Eclipse Temurin JRE 17.0.20.1+1
FROM eclipse-temurin:17-jre@sha256:e04fa72be13b257a59fdec6dc14af78c8f80f035d3c1ed4e03e45552a231d4c8 AS jre

# Python 3.11.17, Debian bookworm
FROM python:3.11-slim-bookworm@sha256:f06d01d4ba3f8ad5af45a3ec87df19c1d317d8e8961edc0fabda61811af6f7cf

COPY --from=jre /opt/java/openjdk /opt/java/openjdk
ENV JAVA_HOME=/opt/java/openjdk \
    PATH=/opt/java/openjdk/bin:$PATH

COPY requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir --no-build-isolation --require-hashes -r /tmp/requirements.txt \
    && rm /tmp/requirements.txt \
    && useradd --uid 10001 --no-create-home --home-dir /tmp --shell /usr/sbin/nologin runner

# Every dependency is listed in requirements-extras.txt (--no-deps), so nothing unpinned can come in; pip check proves
# the set is complete and consistent with PySpark 4.0.1.
COPY requirements-extras.txt /tmp/requirements-extras.txt
RUN pip install --no-cache-dir --no-deps --only-binary :all: --require-hashes -r /tmp/requirements-extras.txt \
    && rm /tmp/requirements-extras.txt \
    && pip check

# Jars go straight into PySpark's own jars directory, so they are on the driver classpath of every session (no
# --packages, which would need the network). From Maven Central, each pinned by SHA-256.
ARG SPARK_JARS=/usr/local/lib/python3.11/site-packages/pyspark/jars
ARG MAVEN=https://repo1.maven.org/maven2
# Avro data source: format("avro"), from_avro/to_avro (Avro itself already ships with Spark).
ADD --chmod=644 --checksum=sha256:834207b759159ceb7e367df9c0fe5998bbb547fdcdc5269dfeeba2c6803559b6 \
    ${MAVEN}/org/apache/spark/spark-avro_2.13/4.0.1/spark-avro_2.13-4.0.1.jar ${SPARK_JARS}/
# Delta Lake 4.0.1 (built on Spark 4.0.1). The harness turns on its SQL extension and catalog only for jobs that use Delta.
ADD --chmod=644 --checksum=sha256:a1e76860b19fe1e6b205a4ea7a9099a2f9575d39bb71d49b3e679b299d0efb91 \
    ${MAVEN}/io/delta/delta-spark_2.13/4.0.1/delta-spark_2.13-4.0.1.jar ${SPARK_JARS}/
ADD --chmod=644 --checksum=sha256:ecc42c5aaa51c423312d9e4e48aa4a12b34740bf2c37de0e8f279277ec3d12e4 \
    ${MAVEN}/io/delta/delta-storage/4.0.1/delta-storage-4.0.1.jar ${SPARK_JARS}/
# JDBC without a server: file databases under /tmp. H2 is pure Java (Spark has an H2 dialect); SQLite matches
# Python's built-in sqlite3, so a job can create a database with plain Python and read it with spark.read.jdbc.
ADD --chmod=644 --checksum=sha256:8dae62d22db8982c3dcb3826edb9c727c5d302063a67eef7d63d82de401f07d3 \
    ${MAVEN}/com/h2database/h2/2.3.232/h2-2.3.232.jar ${SPARK_JARS}/
ADD --chmod=644 --checksum=sha256:a3f53a2aa15ae9425a9e793bbe9c8e5288febeb4b65ef5c1a4e80d4c2045cf08 \
    ${MAVEN}/org/xerial/sqlite-jdbc/3.50.3.0/sqlite-jdbc-3.50.3.0.jar ${SPARK_JARS}/
# snappy-java, zstd-jni and sqlite-jdbc normally unpack their native library into java.io.tmpdir, but /tmp is noexec at
# run time, so loading it from there fails ("failed to map segment"): on 4.0.1-1 that breaks every snappy write
# (Parquet's and Avro's default codec) and zstd (ORC). Unpack this architecture's copies into the read-only image
# instead; JAVA_TOOL_OPTIONS below points each library at its file. (lz4-java falls back to pure Java on its own.)
RUN python3 -c "import platform, zipfile, pathlib; \
arch = platform.machine(); out = pathlib.Path('/opt/native'); out.mkdir(); \
libs = {'snappy-java-1.1.10.7.jar': ('org/xerial/snappy/native/Linux/' + arch + '/libsnappyjava.so', 'libsnappyjava.so'), \
        'zstd-jni-1.5.6-9.jar': ('linux/' + arch + '/libzstd-jni-1.5.6-9.so', 'libzstd-jni.so'), \
        'sqlite-jdbc-3.50.3.0.jar': ('org/sqlite/native/Linux/' + arch + '/libsqlitejdbc.so', 'libsqlitejdbc.so')}; \
[(out / name).write_bytes(zipfile.ZipFile('${SPARK_JARS}/' + jar).read(member)) for jar, (member, name) in libs.items()]" \
    && chmod 755 /opt/native && chmod 644 /opt/native/*.so

COPY sandbox/ /opt/runner/

# The root filesystem is mounted read-only at run time; everything Spark, the JVM and Python write goes to /tmp.
# Loopback only (--network none): the driver binds to 127.0.0.1.
ENV HOME=/tmp \
    SPARK_LOCAL_IP=127.0.0.1 \
    SPARK_LOCAL_DIRS=/tmp/spark \
    PYSPARK_PYTHON=python3 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    JAVA_TOOL_OPTIONS="-Djava.io.tmpdir=/tmp -Dlog4j2.configurationFile=/opt/runner/log4j2.properties -Dorg.xerial.snappy.lib.path=/opt/native -Dorg.xerial.snappy.lib.name=libsnappyjava.so -DZstdNativePath=/opt/native/libzstd-jni.so -Dorg.sqlite.lib.path=/opt/native -Dorg.sqlite.lib.name=libsqlitejdbc.so"

USER 10001:10001
WORKDIR /tmp
ENTRYPOINT ["python3", "/opt/runner/harness.py"]
