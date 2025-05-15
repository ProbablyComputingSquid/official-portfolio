---
title: Raspberry Pi Radio Station
date: 2024-01-13
folder: projects/hardware
category: raspberry pi
tags: raspberry pi, ham radio, hardware, python
---

# Building a Raspberry Pi Radio Station

## Overview
This project involves creating a low-power radio station using a Raspberry Pi and a literal wire. The station broadcasts music and announcements within a small radius (~100 ft, but can be boosted with a better antenna), perfect for school events or local community use. Technically you aren't supposed to use this program for radio station broadcasting unless you have an amateur ham radio liscence, so make sure to get liscensed if you aren't already.

## Hardware Requirements
- Raspberry Pi (any model)
- Antenna (simple wire works)
- Power supply
- Audio source (works with USB sound card, locally stored files or GPIO)

## Software Setup
The station runs using a library (pifmrds) and can be enhanced by running scripts to autogenerate a playlist based on music tracks and voice clips for announcements, or even advertisement. This project is still in the making

https://github.com/ChristopheJacquet/PiFmRds
