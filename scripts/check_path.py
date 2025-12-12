import os

print("CWD:", os.getcwd())
path = r"backend_ai\data\graph\rules\fusion"
abs_path = os.path.abspath(path)
print("ABS:", abs_path)
print("EXISTS:", os.path.exists(abs_path))
print("ISDIR:", os.path.isdir(abs_path))