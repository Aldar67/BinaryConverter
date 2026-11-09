namespace NumberSystems.Core;

public static class DigitAlphabet
{
    private const string Symbols = "0123456789ABCDEF";

    public static char ToSymbol(int value) => Symbols[value];

    /// <summary>Значение цифры без учёта основания; регистр не важен.</summary>
    public static bool TryGetValue(char symbol, out int value)
    {
        value = Symbols.IndexOf(char.ToUpperInvariant(symbol));
        return value >= 0;
    }

    /// <summary>Например, «0–7» или «0–9, A–F».</summary>
    public static string DescribeAllowed(int radix) => radix <= 10
        ? $"0–{ToSymbol(radix - 1)}"
        : radix == 11 ? "0–9, A" : $"0–9, A–{ToSymbol(radix - 1)}";

    public static ConversionError? ValidateRadix(int radix) =>
        radix is < Limits.MinRadix or > Limits.MaxRadix
            ? new ConversionError(ErrorCode.RadixOutOfRange,
                $"Основание должно быть от {Limits.MinRadix} до {Limits.MaxRadix}, получено {radix}.")
            : null;
}
