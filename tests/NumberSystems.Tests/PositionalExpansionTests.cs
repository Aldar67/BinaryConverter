using NumberSystems.Core;

namespace NumberSystems.Tests;

public class PositionalExpansionTests
{
    [Theory]
    [InlineData("1A3", 16, 419)]
    [InlineData("1a3", 16, 419)]
    [InlineData("101", 2, 5)]
    [InlineData("777", 8, 511)]
    [InlineData("FFF", 16, 4095)]
    [InlineData("111111111111", 2, 4095)]
    [InlineData("0", 2, 0)]
    [InlineData("007", 8, 7)]
    public void Converts_to_decimal(string digits, int radix, int expected)
    {
        var result = PositionalExpansion.ToDecimal(digits, radix);

        Assert.True(result.IsSuccess);
        Assert.Equal(expected, result.Value!.Value);
    }

    [Fact]
    public void Builds_terms_from_high_to_low_with_running_sum()
    {
        var terms = PositionalExpansion.ToDecimal("1A3", 16).Value!.Terms;

        Assert.Equal(
            [
                new DigitTerm(2, '1', 1, 256, 256, 256),
                new DigitTerm(1, 'A', 10, 16, 160, 416),
                new DigitTerm(0, '3', 3, 1, 3, 419),
            ],
            terms);
    }

    [Fact]
    public void Zero_is_a_single_term()
    {
        var result = PositionalExpansion.ToDecimal("0", 16).Value!;

        var term = Assert.Single(result.Terms);
        Assert.Equal(0, term.Contribution);
        Assert.Equal(0, result.Value);
    }

    [Theory]
    [InlineData("128", 2, 1)]
    [InlineData("108", 8, 2)]
    [InlineData("1G", 16, 1)]
    [InlineData("1.5", 10, 1)]
    [InlineData("A", 10, 0)]
    public void Reports_invalid_digit_with_position(string digits, int radix, int position)
    {
        var error = PositionalExpansion.ToDecimal(digits, radix).Error!;

        Assert.Equal(ErrorCode.InvalidDigit, error.Code);
        Assert.Equal(position, error.Position);
    }

    [Theory]
    [InlineData("", 10, ErrorCode.EmptyInput)]
    [InlineData("   ", 10, ErrorCode.EmptyInput)]
    [InlineData(null, 10, ErrorCode.EmptyInput)]
    [InlineData("-5", 10, ErrorCode.NegativeNumber)]
    [InlineData("4096", 10, ErrorCode.ValueOutOfRange)]
    [InlineData("1000", 16, ErrorCode.ValueOutOfRange)]
    [InlineData("1111111111111", 2, ErrorCode.TooManyDigits)]
    [InlineData("1", 1, ErrorCode.RadixOutOfRange)]
    [InlineData("1", 17, ErrorCode.RadixOutOfRange)]
    public void Rejects_bad_input(string? digits, int radix, ErrorCode expected)
    {
        Assert.Equal(expected, PositionalExpansion.ToDecimal(digits, radix).Error!.Code);
    }
}
