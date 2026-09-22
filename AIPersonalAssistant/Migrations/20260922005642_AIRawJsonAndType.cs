using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AIPersonalAssistant.Migrations
{
    /// <inheritdoc />
    public partial class AIRawJsonAndType : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "SummaryType",
                table: "AIDailySummaries",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: 1,
                column: "PasswordHash",
                value: "$2a$11$hlBi189vEfmK4sZYHa3HU.d50kfNqRhdAClnfu0MQeLBTsSw5paBC");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "SummaryType",
                table: "AIDailySummaries");

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: 1,
                column: "PasswordHash",
                value: "$2a$11$PzwCby7sZVqUwdJkj7MXOOOcn9HdQNjlR/W9VFCMF2ncsKMM7BPgq");
        }
    }
}
