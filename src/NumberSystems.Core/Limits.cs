namespace NumberSystems.Core;

/// <summary>Границы учебной задачи.</summary>
public static class Limits
{
    public const int MinRadix = 2;
    public const int MaxRadix = 16;
    public const int MaxValue = 4095;

    /// <summary>4095 в двоичной системе — 12 цифр; запас на ведущие нули не нужен.</summary>
    public const int MaxDigits = 12;
}
