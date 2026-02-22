class DevSeeRequestToken {
  const DevSeeRequestToken({required this.rawValue});

  final String rawValue;

  @override
  bool operator ==(Object other) {
    return other is DevSeeRequestToken && other.rawValue == rawValue;
  }

  @override
  int get hashCode => rawValue.hashCode;
}
