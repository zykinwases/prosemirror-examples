FROM python:3.10

RUN apt-get update && apt-get install -y locales && locale-gen en_US.UTF-8
# WTF debian?
RUN sed -i '/# ru_RU.UTF-8 UTF-8/c\ru_RU.UTF-8 UTF-8' /etc/locale.gen
RUN locale-gen ru_RU.UTF-8
ENV LANG ru_RU.utf8
ENV LANGUAGE ru_RU:ru
ENV LC_ALL ru_RU.UTF-8

RUN python3.10 -m pip install pip --upgrade

ADD requirements.txt .
RUN pip3.10 install -r requirements.txt

ADD . .
